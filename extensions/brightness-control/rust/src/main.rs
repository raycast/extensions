//! Native Windows brightness backend (WMI for internal displays + DDC/CI for external).
//!
//! Why this exists: the previous implementation spawned `powershell.exe` on every
//! keypress, recompiled a C# `Add-Type` block, and ran sequential WMI + DDC/CI
//! queries. That costs seconds. This binary calls the same OS APIs directly
//! (WMI `WmiSetBrightness`, dxva2 `SetVCPFeature`) with no new process and no
//! C# compilation, so a hotkey press completes in milliseconds.
//!
//! The `#[raycast]` macro auto-generates `main` (a tokio CLI dispatcher), so
//! this file intentionally has no `main` function.

use raycast_rust_macros::raycast;
use serde::Serialize;

/// Matches the TS `MonitorResult` interface in `src/utils/ddc-ci.ts`.
#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MonitorResult {
    #[serde(rename = "type")]
    pub monitor_type: String,
    pub index: usize,
    pub description: String,
    pub brightness: i32,
    pub max_brightness: i32,
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub new_brightness: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub set_result: Option<bool>,
}

#[raycast]
fn brightness_get() -> Result<Vec<MonitorResult>, String> {
    run_action(Action::Get)
}

#[raycast]
fn brightness_set(level: i32) -> Result<Vec<MonitorResult>, String> {
    let level = level.clamp(0, 100);
    run_action(Action::Set(level))
}

#[raycast]
fn brightness_adjust(offset: i32) -> Result<Vec<MonitorResult>, String> {
    run_action(Action::Offset(offset))
}

#[derive(Clone, Copy, Debug)]
enum Action {
    Get,
    Set(i32),
    Offset(i32),
}

#[cfg(windows)]
fn run_action(action: Action) -> Result<Vec<MonitorResult>, String> {
    let mut results: Vec<MonitorResult> = Vec::new();
    let mut index: usize = 0;

    // WMI first (internal / laptop panels). Failure here is normal on desktops
    // with no WMI brightness support — fall through to DDC/CI.
    if let Err(e) = wmi_action(action, &mut results, &mut index) {
        eprintln!("brightness wmi path skipped: {e}");
    }

    if let Err(e) = ddc_action(action, &mut results, &mut index) {
        eprintln!("brightness ddc path skipped: {e}");
    }

    // Never report an empty list as success: the TS bridge treats an empty
    // result as "native found nothing" and falls back to PowerShell, but an
    // explicit error makes the contract obvious for any direct CLI use too.
    if results.is_empty() {
        return Err("No brightness-capable monitors found".to_string());
    }

    Ok(results)
}

#[cfg(not(windows))]
fn run_action(_action: Action) -> Result<Vec<MonitorResult>, String> {
    Err("brightness native backend is Windows-only".to_string())
}

// ---------------------------------------------------------------------------
// WMI (internal displays)
// ---------------------------------------------------------------------------

#[cfg(windows)]
#[derive(serde::Deserialize, Debug)]
#[allow(non_snake_case)]
struct WmiMonitorBrightness {
    InstanceName: String,
    CurrentBrightness: u8,
}

#[cfg(windows)]
#[derive(serde::Deserialize, Debug)]
#[allow(non_snake_case)]
struct WmiMonitorBrightnessMethods {
    InstanceName: String,
    // NOTE: no `alias` here on purpose. The `wmi` crate drives deserialization
    // from the struct's declared field list, so an alias would visit the same
    // field twice ("duplicate field" error). COM property lookup itself is
    // case-insensitive, so the single rename is enough.
    #[serde(rename = "__PATH", default)]
    __PATH: Option<String>,
    #[serde(rename = "__RELPATH", default)]
    __RELPATH: Option<String>,
}

#[cfg(windows)]
fn wmi_set_brightness(
    con: &wmi::WMIConnection,
    object_path: &str,
    target: i32,
) -> Result<bool, String> {
    // Build the WmiSetBrightness(Timeout, Brightness) in-params explicitly and
    // use the low-level exec_method: some providers return no output object
    // (ppOutParams NULL) even though the call succeeds, which the typed
    // exec_instance_method wrapper cannot represent.
    let in_params = {
        let class = con
            .get_object("WmiMonitorBrightnessMethods")
            .map_err(|e| e.to_string())?;
        match class.get_method("WmiSetBrightness").map_err(|e| e.to_string())? {
            Some(method_class) => {
                let instance = method_class.spawn_instance().map_err(|e| e.to_string())?;
                // 0 = apply immediately (powershell path used a 1s timeout).
                instance
                    .put_property("Timeout", 0u32)
                    .map_err(|e| e.to_string())?;
                instance
                    .put_property("Brightness", target.clamp(0, 100) as u8)
                    .map_err(|e| e.to_string())?;
                Some(instance)
            }
            None => None,
        }
    };

    match con.exec_method(object_path, "WmiSetBrightness", in_params.as_ref()) {
        Ok(output) => {
            // A successful call with no output object still applied the change.
            // When ReturnValue is present, require it to be 0.
            let ok = match output {
                Some(wrapper) => match wrapper.get_property("ReturnValue") {
                    Ok(wmi::Variant::UI4(0)) => true,
                    Ok(wmi::Variant::Empty) => true,
                    Ok(_) => false,
                    // Missing ReturnValue property: the call itself succeeded.
                    Err(_) => true,
                },
                None => true,
            };
            Ok(ok)
        }
        Err(e) => Err(e.to_string()),
    }
}

#[cfg(windows)]
fn wmi_action(
    action: Action,
    results: &mut Vec<MonitorResult>,
    index: &mut usize,
) -> Result<(), String> {
    use wmi::WMIConnection;

    let con = WMIConnection::with_namespace_path("ROOT\\WMI").map_err(|e| e.to_string())?;

    let monitors: Vec<WmiMonitorBrightness> = con.query().map_err(|e| e.to_string())?;
    if monitors.is_empty() {
        return Ok(());
    }

    match action {
        Action::Get => {
            for mon in monitors {
                results.push(MonitorResult {
                    monitor_type: "wmi".to_string(),
                    index: *index,
                    description: mon.InstanceName,
                    brightness: i32::from(mon.CurrentBrightness),
                    max_brightness: 100,
                    success: true,
                    new_brightness: None,
                    set_result: None,
                });
                *index += 1;
            }
            Ok(())
        }
        Action::Set(_) | Action::Offset(_) => {
            // Methods instances carry the object path needed for ExecMethod.
            // Query failures here mean "can't set via WMI" — report per-monitor
            // failures rather than failing the whole call.
            let methods: Vec<WmiMonitorBrightnessMethods> =
                con.query().map_err(|e| e.to_string())?;

            for mon in monitors {
                let target: i32 = match action {
                    Action::Set(level) => level.clamp(0, 100),
                    Action::Offset(off) => (i32::from(mon.CurrentBrightness) + off).clamp(0, 100),
                    Action::Get => unreachable!(),
                };

                let mut set_succeeded = false;
                let mut attempted = false;
                for method in methods
                    .iter()
                    .filter(|m| m.InstanceName == mon.InstanceName)
                {
                    let path = method.__PATH.as_deref().or(method.__RELPATH.as_deref());
                    let Some(path) = path else { continue };
                    attempted = true;
                    match wmi_set_brightness(&con, path, target) {
                        Ok(true) => {
                            set_succeeded = true;
                        }
                        Ok(false) => {}
                        Err(e) => {
                            eprintln!("WmiSetBrightness failed for {}: {e}", mon.InstanceName);
                        }
                    }
                }

                results.push(MonitorResult {
                    monitor_type: "wmi".to_string(),
                    index: *index,
                    description: mon.InstanceName,
                    brightness: i32::from(mon.CurrentBrightness),
                    max_brightness: 100,
                    success: true,
                    new_brightness: Some(target),
                    set_result: Some(if attempted { set_succeeded } else { false }),
                });
                *index += 1;
            }
            Ok(())
        }
    }
}

// ---------------------------------------------------------------------------
// DDC/CI (external displays via dxva2)
// ---------------------------------------------------------------------------

#[cfg(windows)]
fn ddc_action(
    action: Action,
    results: &mut Vec<MonitorResult>,
    index: &mut usize,
) -> Result<(), String> {
    use windows::Win32::Devices::Display::{
        DestroyPhysicalMonitors, GetNumberOfPhysicalMonitorsFromHMONITOR,
        GetPhysicalMonitorsFromHMONITOR, GetVCPFeatureAndVCPFeatureReply, SetVCPFeature,
        PHYSICAL_MONITOR,
    };
    use windows::Win32::Foundation::{HANDLE, LPARAM, RECT, TRUE};
    use windows::Win32::Graphics::Gdi::{EnumDisplayMonitors, HDC, HMONITOR};
    use windows::core::BOOL;

    const BRIGHTNESS_VCP: u8 = 0x10;

    unsafe extern "system" fn enum_proc(
        hmonitor: HMONITOR,
        _hdc: HDC,
        _rect: *mut RECT,
        lparam: LPARAM,
    ) -> BOOL {
        let out = &mut *(lparam.0 as *mut Vec<HMONITOR>);
        out.push(hmonitor);
        TRUE
    }

    unsafe {
        let mut hmonitors: Vec<HMONITOR> = Vec::new();
        let enumerated: BOOL = EnumDisplayMonitors(
            None,
            None,
            Some(enum_proc),
            LPARAM(&mut hmonitors as *mut Vec<HMONITOR> as isize),
        );
        if !enumerated.as_bool() {
            return Err("EnumDisplayMonitors failed".to_string());
        }

        for hmonitor in hmonitors {
            let mut count: u32 = 0;
            if GetNumberOfPhysicalMonitorsFromHMONITOR(hmonitor, &mut count).is_err() {
                continue;
            }
            if count == 0 {
                continue;
            }

            let mut physical: Vec<PHYSICAL_MONITOR> =
                vec![PHYSICAL_MONITOR::default(); count as usize];
            if GetPhysicalMonitorsFromHMONITOR(hmonitor, &mut physical).is_err() {
                continue;
            }

            for idx_pm in 0..physical.len() {
                // NOTE: PHYSICAL_MONITOR is #[repr(C, packed(1))], so field
                // access through a reference is unaligned — copy via addr_of.
                let base = physical.as_ptr().wrapping_add(idx_pm);
                let handle: HANDLE =
                    std::ptr::addr_of!((*base).hPhysicalMonitor).read_unaligned();
                let desc_buf: [u16; 128] =
                    std::ptr::addr_of!((*base).szPhysicalMonitorDescription).read_unaligned();
                let desc = wide_to_string(&desc_buf);

                let mut current: u32 = 0;
                let mut max: u32 = 0;
                let vcp_ok = GetVCPFeatureAndVCPFeatureReply(
                    handle,
                    BRIGHTNESS_VCP,
                    None,
                    &mut current,
                    Some(&mut max),
                );
                if vcp_ok == 0 {
                    continue;
                }
                let max_i = if max == 0 { 100 } else { max as i32 };

                match action {
                    Action::Get => {
                        results.push(MonitorResult {
                            monitor_type: "ddc".to_string(),
                            index: *index,
                            description: desc,
                            brightness: current as i32,
                            max_brightness: max_i,
                            success: true,
                            new_brightness: None,
                            set_result: None,
                        });
                        *index += 1;
                    }
                    Action::Set(level) => {
                        let target = level.clamp(0, max_i);
                        let ok = SetVCPFeature(handle, BRIGHTNESS_VCP, target as u32) != 0;
                        results.push(MonitorResult {
                            monitor_type: "ddc".to_string(),
                            index: *index,
                            description: desc,
                            brightness: current as i32,
                            max_brightness: max_i,
                            success: true,
                            new_brightness: Some(target),
                            set_result: Some(ok),
                        });
                        *index += 1;
                    }
                    Action::Offset(off) => {
                        let target = ((current as i32) + off).clamp(0, max_i);
                        let ok = SetVCPFeature(handle, BRIGHTNESS_VCP, target as u32) != 0;
                        results.push(MonitorResult {
                            monitor_type: "ddc".to_string(),
                            index: *index,
                            description: desc,
                            brightness: current as i32,
                            max_brightness: max_i,
                            success: true,
                            new_brightness: Some(target),
                            set_result: Some(ok),
                        });
                        *index += 1;
                    }
                }
            }

            let _ = DestroyPhysicalMonitors(&physical);
        }
    }

    Ok(())
}

#[cfg(windows)]
fn wide_to_string(buf: &[u16]) -> String {
    let len = buf.iter().position(|&c| c == 0).unwrap_or(buf.len());
    String::from_utf16_lossy(&buf[..len])
}
