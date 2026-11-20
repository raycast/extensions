use raycast_rust_macros::raycast;
use serde::Serialize;
use windows::core::{PCWSTR, PWSTR};
use windows::Win32::Foundation::{CloseHandle, ERROR_SUCCESS, HWND, LPARAM, WPARAM};
use windows::Win32::Globalization::GetLocaleInfoW;
use windows::Win32::System::Registry::{
  RegCloseKey, RegEnumKeyExW, RegOpenKeyExW, RegQueryValueExW, HKEY, HKEY_LOCAL_MACHINE, KEY_READ,
};
use windows::Win32::System::Threading::{
  AttachThreadInput, GetCurrentThreadId, OpenProcess, QueryFullProcessImageNameW,
  PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION,
};
use windows::Win32::UI::Input::KeyboardAndMouse::{
  ActivateKeyboardLayout, GetKeyboardLayout, GetKeyboardLayoutList, ACTIVATE_KEYBOARD_LAYOUT_FLAGS,
  HKL,
};
use windows::Win32::UI::Shell::SHLoadIndirectString;
use windows::Win32::UI::WindowsAndMessaging::{
  GetForegroundWindow, GetGUIThreadInfo, GetWindowThreadProcessId, PostMessageW, GUITHREADINFO,
  WM_INPUTLANGCHANGEREQUEST,
};

use std::collections::{HashMap, HashSet};
use std::time::Duration;

const KLID_REGISTRY_PATH: &str = r"SYSTEM\CurrentControlSet\Control\Keyboard Layouts";
const LOCALE_SENGLISHDISPLAYNAME: u32 = 0x1072;

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct KeyboardLayout {
  pub id: String,
  pub title: String,
  pub active: bool,
  #[serde(skip)]
  pub raw_hkl: usize,
}

fn wide(s: &str) -> Vec<u16> {
  s.encode_utf16().chain(std::iter::once(0)).collect()
}

fn is_klid(s: &str) -> bool {
  s.len() == 8 && s.chars().all(|c| c.is_ascii_hexdigit())
}

unsafe fn read_reg_string(hkey: HKEY, value_name: &str) -> Option<String> {
  let name = wide(value_name);
  let mut size: u32 = 0;
  let status = RegQueryValueExW(
    hkey,
    PCWSTR(name.as_ptr()),
    None,
    None,
    None,
    Some(&mut size),
  );
  if status != ERROR_SUCCESS || size == 0 {
    return None;
  }
  let mut buf = vec![0u8; size as usize];
  let status = RegQueryValueExW(
    hkey,
    PCWSTR(name.as_ptr()),
    None,
    None,
    Some(buf.as_mut_ptr()),
    Some(&mut size),
  );
  if status != ERROR_SUCCESS {
    return None;
  }
  let words: Vec<u16> = buf
    .chunks_exact(2)
    .map(|c| u16::from_le_bytes([c[0], c[1]]))
    .collect();
  let value = String::from_utf16_lossy(&words)
    .trim_end_matches('\0')
    .to_string();
  if value.is_empty() {
    None
  } else {
    Some(value)
  }
}

unsafe fn open_registry_key(path: &str) -> Option<HKEY> {
  let path_w = wide(path);
  let mut hkey = HKEY::default();
  if RegOpenKeyExW(
    HKEY_LOCAL_MACHINE,
    PCWSTR(path_w.as_ptr()),
    0,
    KEY_READ,
    &mut hkey,
  ) == ERROR_SUCCESS
  {
    Some(hkey)
  } else {
    None
  }
}

/// Resolves a layout's human readable title: indirect display name ("@input.dll,-5020")
/// or legacy "Layout Text", falling back to the language's English display name.
unsafe fn resolve_layout_title(klid: Option<&String>, langid: u16) -> String {
  let layout_text = klid.and_then(|k| {
    let hkey = open_registry_key(&format!("{KLID_REGISTRY_PATH}\\{k}"))?;
    let indirect = read_reg_string(hkey, "Layout Display Name");
    let title = if let Some(indirect) = indirect {
      let mut out = [0u16; 512];
      let hr = SHLoadIndirectString(PCWSTR(wide(&indirect).as_ptr()), &mut out, None);
      if hr.is_ok() {
        let end = out.iter().position(|&c| c == 0).unwrap_or(out.len());
        let resolved = String::from_utf16_lossy(&out[..end]);
        let trimmed = resolved.trim().to_string();
        if trimmed.is_empty() {
          read_reg_string(hkey, "Layout Text")
        } else {
          Some(trimmed)
        }
      } else {
        read_reg_string(hkey, "Layout Text")
      }
    } else {
      read_reg_string(hkey, "Layout Text")
    };
    let _ = RegCloseKey(hkey);
    title
  });

  let lang_name = {
    let mut buf = [0u16; 256];
    let len = GetLocaleInfoW(langid as u32, LOCALE_SENGLISHDISPLAYNAME, Some(&mut buf));
    if len > 1 {
      Some(String::from_utf16_lossy(&buf[..(len - 1) as usize]))
    } else {
      None
    }
  };

  match (lang_name, layout_text) {
    (Some(lang), Some(text)) if lang.to_lowercase().contains(&text.to_lowercase()) => lang,
    (Some(lang), Some(text)) => format!("{lang} ({text})"),
    (Some(lang), None) => lang,
    (None, Some(text)) => text,
    (None, None) => format!("Layout {langid:04X}"),
  }
}

/// Layouts registered under the Keyboard Layouts registry key.
///
/// We deliberately never call LoadKeyboardLayout: on Windows 8+ it adds the
/// layout to the user's input method list as a side effect.
struct RegisteredLayouts {
  /// All registry KLIDs.
  klids: HashSet<String>,
  /// (language id, "Layout Id" ordinal) -> KLID.
  variants: HashMap<(u16, u16), String>,
}

unsafe fn registered_layouts() -> RegisteredLayouts {
  let mut klids = HashSet::new();
  let mut variants = HashMap::new();

  for key in enum_subkeys(KLID_REGISTRY_PATH) {
    if !is_klid(&key) {
      continue;
    }
    let klid = key.to_lowercase();
    if let Some(langid) = klid_langid(&klid) {
      if let Some(hkey) = open_registry_key(&format!("{KLID_REGISTRY_PATH}\\{klid}")) {
        let ordinal = read_reg_string(hkey, "Layout Id")
          .and_then(|value| u16::from_str_radix(value.trim(), 16).ok());
        if let Some(ordinal) = ordinal {
          variants.insert((langid, ordinal), klid.clone());
        }
        let _ = RegCloseKey(hkey);
      }
    }
    klids.insert(klid);
  }

  RegisteredLayouts { klids, variants }
}

/// Language id encoded in the low 16 bits of a KLID.
fn klid_langid(klid: &str) -> Option<u16> {
  u16::from_str_radix(klid.get(4..8)?, 16).ok()
}

/// Candidate registry KLIDs for an HKL value:
/// - standard layouts ("0000xxxx" keys) surface as HKLs whose high word equals
///   the language id (e.g. KLID "00000409" -> HKL 0x04090409)
/// - some variants and legacy IMEs use the KLID verbatim (e.g. KLID
///   "e00e0411" Japanese IME -> HKL 0xe00e0411)
fn klid_candidates(raw: usize) -> [Option<String>; 2] {
  let raw = raw as u32;
  let langid = raw & 0xFFFF;
  let high = (raw >> 16) & 0xFFFF;
  [
    Some(format!("{raw:08x}")),
    if high == langid {
      Some(format!("0000{langid:04x}"))
    } else {
      None
    },
  ]
}

/// Resolves the registry KLID for an HKL value.
///
/// Substituted layouts do not use their KLID as the handle: Dvorak
/// ("00010409") reports 0xf0020409 and US-International ("00020409") reports
/// 0xf0010409. In those handles the low byte of the high word is the registry's
/// "Layout Id" value (0x0002 and 0x0001 respectively), so variant handles are
/// matched through that value instead.
fn find_klid(raw: usize, layouts: &RegisteredLayouts) -> Option<String> {
  if let Some(klid) = klid_candidates(raw)
    .into_iter()
    .flatten()
    .find(|candidate| layouts.klids.contains(candidate))
  {
    return Some(klid);
  }

  let raw = raw as u32;
  let high = (raw >> 16) & 0xFFFF;
  if high & 0xFF00 == 0xF000 {
    let langid = (raw & 0xFFFF) as u16;
    return layouts
      .variants
      .get(&(langid, (high & 0x00FF) as u16))
      .cloned();
  }
  None
}

unsafe fn enum_subkeys(path: &str) -> Vec<String> {
  let mut result = Vec::new();
  let Some(hkey) = open_registry_key(path) else {
    return result;
  };
  let mut index = 0u32;
  loop {
    let mut name_buf = [0u16; 64];
    let mut name_len = name_buf.len() as u32;
    let status = RegEnumKeyExW(
      hkey,
      index,
      PWSTR(name_buf.as_mut_ptr()),
      &mut name_len,
      None,
      PWSTR(std::ptr::null_mut()),
      None,
      None,
    );
    if status != ERROR_SUCCESS {
      break;
    }
    result.push(String::from_utf16_lossy(&name_buf[..name_len as usize]));
    index += 1;
  }
  let _ = RegCloseKey(hkey);
  result
}

unsafe fn focused_target() -> Result<(HWND, u32), String> {
  let fg = GetForegroundWindow();
  if fg.is_invalid() {
    return Err("No foreground window".to_string());
  }

  let mut foreground_pid = 0u32;
  let foreground_tid = GetWindowThreadProcessId(fg, Some(&mut foreground_pid));
  if foreground_tid == 0 {
    return Err("No foreground thread".to_string());
  }

  let mut gui = GUITHREADINFO::default();
  gui.cbSize = std::mem::size_of::<GUITHREADINFO>() as u32;
  let target = if GetGUIThreadInfo(foreground_tid, &mut gui).is_ok() && !gui.hwndFocus.is_invalid()
  {
    gui.hwndFocus
  } else {
    fg
  };
  let target_tid = GetWindowThreadProcessId(target, None);
  if target_tid == 0 {
    return Err("No focused input thread".to_string());
  }

  Ok((target, target_tid))
}

unsafe fn get_active_hkl() -> HKL {
  focused_target()
    .map(|(_, tid)| GetKeyboardLayout(tid))
    .unwrap_or_else(|_| GetKeyboardLayout(0))
}

unsafe fn wait_for_foreground_change(excluded_pid: u32) -> Result<(), String> {
  if excluded_pid == 0 {
    return Ok(());
  }

  for _ in 0..100 {
    let fg = GetForegroundWindow();
    if !fg.is_invalid() {
      let mut pid = 0u32;
      GetWindowThreadProcessId(fg, Some(&mut pid));
      if pid != 0 && pid != excluded_pid {
        return Ok(());
      }
    }
    std::thread::sleep(Duration::from_millis(20));
  }

  Err("Raycast closed, but the foreground application did not become available".to_string())
}

unsafe fn wait_for_layout(thread_id: u32, target: HKL) -> bool {
  for _ in 0..50 {
    if GetKeyboardLayout(thread_id).0 as usize == target.0 as usize {
      return true;
    }
    std::thread::sleep(Duration::from_millis(20));
  }
  GetKeyboardLayout(thread_id).0 as usize == target.0 as usize
}

unsafe fn list_layouts_impl() -> Result<Vec<KeyboardLayout>, String> {
  let count = GetKeyboardLayoutList(None);
  if count <= 0 {
    return Err("No keyboard layouts are installed".to_string());
  }
  let mut buffer = vec![HKL(std::ptr::null_mut()); count as usize];
  let written = GetKeyboardLayoutList(Some(&mut buffer));
  if written <= 0 {
    return Err("Failed to enumerate keyboard layouts".to_string());
  }

  let registry = registered_layouts();
  let active_hkl = get_active_hkl();
  let active_raw = active_hkl.0 as usize;
  let active_langid = (active_raw & 0xFFFF) as u16;

  let mut layouts: Vec<KeyboardLayout> = Vec::with_capacity(buffer.len());
  let mut seen = HashSet::new();
  for hkl in buffer.into_iter().take(written as usize) {
    let raw = hkl.0 as usize;
    // GetKeyboardLayoutList can report the same HKL more than once
    if !seen.insert(raw) {
      continue;
    }
    let langid = (raw & 0xFFFF) as u16;
    let klid = find_klid(raw, &registry);
    let id = klid.clone().unwrap_or_else(|| format!("hkl:{raw:08x}"));
    let title = resolve_layout_title(klid.as_ref(), langid);
    layouts.push(KeyboardLayout {
      id,
      title,
      active: raw == active_raw,
      raw_hkl: raw,
    });
  }

  // Fallback when the exact HKL differs (e.g. TSF variants): match by language.
  if !layouts.iter().any(|l| l.active) {
    if let Some(layout) = layouts
      .iter_mut()
      .find(|l| l.id.ends_with(&format!("{active_langid:04x}")))
    {
      layout.active = true;
    }
  }

  layouts.sort_by(|a, b| a.title.to_lowercase().cmp(&b.title.to_lowercase()));
  Ok(layouts)
}

/// Documented switch path: ask the focused window - its focused child control
/// when it has one - to change the input locale. Only honored by windows that
/// own keyboard focus.
unsafe fn request_layout_change(target: HWND, hkl: HKL) -> bool {
  PostMessageW(
    target,
    WM_INPUTLANGCHANGEREQUEST,
    WPARAM(0),
    LPARAM(hkl.0 as isize),
  )
  .is_ok()
}

/// Activate a layout on the foreground thread via queue attachment.
/// Used as a fallback when WM_INPUTLANGCHANGEREQUEST is not accepted.
unsafe fn activate_foreground_thread(hkl: HKL, tid: u32) -> Result<(), String> {
  let me = GetCurrentThreadId();
  let attached = AttachThreadInput(me, tid, true).as_bool();
  let result = ActivateKeyboardLayout(hkl, ACTIVATE_KEYBOARD_LAYOUT_FLAGS(0));
  if attached {
    let _ = AttachThreadInput(me, tid, false);
  }
  result
    .map(|_| ())
    .map_err(|e| format!("Activation failed ({e})"))
}

unsafe fn switch_to(target: &KeyboardLayout) -> Result<(), String> {
  // Activate the handle exactly as Windows reported it: substituted layouts such
  // as Dvorak cannot be reconstructed from their registry KLID.
  let hkl = HKL(target.raw_hkl as *mut core::ffi::c_void);
  let (target_window, target_tid) = focused_target()?;

  if GetKeyboardLayout(target_tid).0 as usize == hkl.0 as usize {
    return Ok(());
  }

  if request_layout_change(target_window, hkl) && wait_for_layout(target_tid, hkl) {
    return Ok(());
  }

  activate_foreground_thread(hkl, target_tid)?;
  if wait_for_layout(target_tid, hkl) {
    Ok(())
  } else {
    Err(format!(
      "Windows did not apply the '{}' layout",
      target.title
    ))
  }
}

unsafe fn activate_layout_impl(id: &str, wait_for_pid: u32) -> Result<(), String> {
  wait_for_foreground_change(wait_for_pid)?;
  let layouts = list_layouts_impl()?;
  let target = layouts
    .iter()
    .find(|l| l.id == id)
    .ok_or_else(|| format!("Layout '{id}' is not installed"))?;
  switch_to(target)
}

#[raycast]
fn list_layouts() -> Result<Vec<KeyboardLayout>, String> {
  unsafe { list_layouts_impl() }
}

/// True when the process's executable image is Raycast itself.
///
/// Checking the full image path keeps this unambiguous: Raycast's Windows
/// binary is always `...\raycast.exe`, and helper or child processes with a
/// different basename are correctly rejected.
unsafe fn is_raycast_process(pid: u32) -> bool {
  let Ok(handle) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) else {
    return false;
  };
  let mut buf = [0u16; 512];
  let mut len = buf.len() as u32;
  let read = QueryFullProcessImageNameW(
    handle,
    PROCESS_NAME_WIN32,
    PWSTR(buf.as_mut_ptr()),
    &mut len,
  )
  .is_ok();
  let _ = CloseHandle(handle);
  if !read {
    return false;
  }
  let path = String::from_utf16_lossy(&buf[..len as usize]);
  let path = path.replace('/', "\\");
  path
    .rsplit('\\')
    .next()
    .is_some_and(|name| name.eq_ignore_ascii_case("raycast.exe"))
}

/// The foreground PID only when Raycast itself is the foreground window, else 0.
///
/// The close-then-wait flow must only wait on Raycast: when the command runs
/// while the Raycast window is visible, closing it hands focus back to the
/// app the user was typing in. When another app is already in front there is
/// nothing to wait for, and waiting on it would only time out.
#[raycast]
fn raycast_foreground_pid() -> Result<u32, String> {
  unsafe {
    let fg = GetForegroundWindow();
    if fg.is_invalid() {
      return Ok(0);
    }
    let mut pid = 0u32;
    if GetWindowThreadProcessId(fg, Some(&mut pid)) == 0 || pid == 0 {
      return Ok(0);
    }
    if is_raycast_process(pid) {
      Ok(pid)
    } else {
      Ok(0)
    }
  }
}

#[raycast]
fn activate_layout(id: String, wait_for_pid: u32) -> Result<(), String> {
  unsafe { activate_layout_impl(&id, wait_for_pid) }
}

#[raycast]
fn toggle_layout(wait_for_pid: u32) -> Result<KeyboardLayout, String> {
  unsafe {
    wait_for_foreground_change(wait_for_pid)?;
    let layouts = list_layouts_impl()?;
    if layouts.is_empty() {
      return Err("No keyboard layouts are installed".to_string());
    }

    let base = layouts.iter().position(|layout| layout.active).unwrap_or(0);
    let next = (base + 1) % layouts.len();
    let target = layouts[next].clone();

    switch_to(&target)?;
    Ok(KeyboardLayout {
      active: true,
      ..target
    })
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  fn registry() -> RegisteredLayouts {
    RegisteredLayouts {
      klids: ["00000409", "00010409", "00020409"]
        .into_iter()
        .map(str::to_string)
        .collect(),
      variants: [
        ((0x0409, 0x0001), "00020409".to_string()),
        ((0x0409, 0x0002), "00010409".to_string()),
      ]
      .into_iter()
      .collect(),
    }
  }

  #[test]
  fn resolves_variant_handles_through_layout_id() {
    let registry = registry();

    // Dvorak and US-International report substituted handles whose high word
    // is 0xf000 | "Layout Id", not their registry KLID.
    assert_eq!(
      find_klid(0xf002_0409, &registry).as_deref(),
      Some("00010409")
    );
    assert_eq!(
      find_klid(0xf001_0409, &registry).as_deref(),
      Some("00020409")
    );
  }

  #[test]
  fn resolves_standard_and_verbatim_handles() {
    let registry = registry();

    assert_eq!(
      find_klid(0x0409_0409, &registry).as_deref(),
      Some("00000409")
    );
    assert_eq!(find_klid(0xe00e_0411, &registry), None);
  }

  #[test]
  fn reads_language_id_from_klid() {
    assert_eq!(klid_langid("00010409"), Some(0x0409));
    assert_eq!(klid_langid("e00e0411"), Some(0x0411));
    assert_eq!(klid_langid("nope"), None);
  }
}
