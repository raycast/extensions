use raycast_rust_macros::raycast;
use windows::{
    Win32::{
        Foundation::POINT,
        Graphics::Gdi::{
            DISPLAY_DEVICEW, EnumDisplayDevicesW, GetMonitorInfoW, HMONITOR,
            MONITOR_DEFAULTTONEAREST, MONITORINFOEXW, MonitorFromPoint,
        },
        System::Com::{
            CLSCTX_ALL, COINIT_APARTMENTTHREADED, CoCreateInstance, CoInitializeEx, CoTaskMemFree,
        },
        UI::{
            Shell::{DesktopWallpaper, IDesktopWallpaper},
            WindowsAndMessaging::{EDD_GET_DEVICE_INTERFACE_NAME, GetCursorPos},
        },
    },
    core::{PCWSTR, PWSTR},
};

fn get_device_id_under_cursor() -> Option<String> {
    unsafe {
        let mut pt = POINT::default();
        GetCursorPos(&mut pt).ok()?;

        let hmonitor: HMONITOR = MonitorFromPoint(pt, MONITOR_DEFAULTTONEAREST);
        let mut info = MONITORINFOEXW::default();
        info.monitorInfo.cbSize = std::mem::size_of::<MONITORINFOEXW>() as u32;

        if !GetMonitorInfoW(hmonitor, &mut info.monitorInfo).as_bool() {
            return None;
        }

        let device_name = PCWSTR(info.szDevice.as_ptr());

        let mut display_device = DISPLAY_DEVICEW::default();
        display_device.cb = std::mem::size_of::<DISPLAY_DEVICEW>() as u32;

        if EnumDisplayDevicesW(
            device_name,
            0,
            &mut display_device,
            EDD_GET_DEVICE_INTERFACE_NAME,
        )
        .as_bool()
        {
            let device_id = String::from_utf16_lossy(
                &display_device
                    .DeviceID
                    .iter()
                    .take_while(|&&c| c != 0)
                    .copied()
                    .collect::<Vec<u16>>(),
            );
            Some(device_id)
        } else {
            None
        }
    }
}

#[raycast]
fn set_wallpaper(image_path: String, mode: String) -> Result<String, String> {
    let widestr: Vec<u16> = image_path
        .encode_utf16()
        .chain(std::iter::once(0))
        .collect();
    let image_pcwstr = PCWSTR(widestr.as_ptr());

    unsafe {
        CoInitializeEx(None, COINIT_APARTMENTTHREADED)
            .ok()
            .map_err(|e| e.to_string())?;
        let wallpaper: IDesktopWallpaper =
            CoCreateInstance(&DesktopWallpaper, None, CLSCTX_ALL).map_err(|e| e.to_string())?;

        if mode == "every" {
            // For "every" mode, use SetWallpaper with None to set on all monitors
            wallpaper
                .SetWallpaper(PCWSTR::null(), image_pcwstr)
                .map_err(|e| e.to_string())?;
        } else if mode == "current" {
            // For "current" mode, set only on the monitor under cursor
            let target_id = get_device_id_under_cursor()
                .ok_or_else(|| "Unable to identify current monitor".to_string())?;
            let count = wallpaper
                .GetMonitorDevicePathCount()
                .map_err(|e| e.to_string())?;

            for i in 0..count {
                let monitor_id: PWSTR = wallpaper
                    .GetMonitorDevicePathAt(i)
                    .map_err(|e| e.to_string())?;

                let id_str = match monitor_id.to_string() {
                    Ok(id) => id,
                    Err(e) => {
                        CoTaskMemFree(Some(monitor_id.0 as *const _));
                        return Err(e.to_string());
                    }
                };

                if id_str == target_id {
                    let result = wallpaper.SetWallpaper(PCWSTR(monitor_id.0), image_pcwstr);
                    CoTaskMemFree(Some(monitor_id.0 as *const _));
                    result.map_err(|e| e.to_string())?;
                    return Ok("ok".to_string());
                }

                CoTaskMemFree(Some(monitor_id.0 as *const _));
            }

            return Err("Unable to match current monitor".to_string());
        }
    }

    Ok("ok".to_string())
}
