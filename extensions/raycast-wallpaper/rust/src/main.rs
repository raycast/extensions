use raycast_rust_macros::raycast;
use windows::{
    core::{PCWSTR, PWSTR},
    Win32::{
        Foundation::POINT,
        Graphics::Gdi::{
            EnumDisplayDevicesW, DISPLAY_DEVICEW,
            MonitorFromPoint, GetMonitorInfoW, MONITORINFOEXW, MONITOR_DEFAULTTONEAREST, HMONITOR,
        },
        System::Com::{CoCreateInstance, CoInitializeEx, CLSCTX_ALL, COINIT_APARTMENTTHREADED},
        UI::{
            Shell::{DesktopWallpaper, IDesktopWallpaper},
            WindowsAndMessaging::{GetCursorPos, EDD_GET_DEVICE_INTERFACE_NAME},
        },
    },
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

        if EnumDisplayDevicesW(device_name, 0, &mut display_device, EDD_GET_DEVICE_INTERFACE_NAME).as_bool() {
            let device_id = String::from_utf16_lossy(
                &display_device.DeviceID.iter().take_while(|&&c| c != 0).copied().collect::<Vec<u16>>(),
            );
            Some(device_id)
        } else {
            None
        }
    }
}

#[raycast]
fn set_wallpaper(image_path: String, mode: String) -> Result<String, String> {
    let widestr: Vec<u16> = image_path.encode_utf16().chain(std::iter::once(0)).collect();
    let image_pcwstr = PCWSTR(widestr.as_ptr());

    // Determine target device based on mode
    let target_device_id = if mode == "current" {
        get_device_id_under_cursor()
    } else {
        None // For "every" mode, set on all monitors
    };

    unsafe {
        CoInitializeEx(None, COINIT_APARTMENTTHREADED)
            .ok()
            .map_err(|e| e.to_string())?;
        let wallpaper: IDesktopWallpaper = CoCreateInstance(&DesktopWallpaper, None, CLSCTX_ALL)
            .map_err(|e| e.to_string())?;

        if mode == "every" {
            // For "every" mode, use SetWallpaper with None to set on all monitors
            wallpaper.SetWallpaper(PCWSTR::null(), image_pcwstr)
                .map_err(|e| e.to_string())?;
        } else if mode == "current" {
            // For "current" mode, set only on the monitor under cursor
            if let Some(target_id) = target_device_id {
                let count = wallpaper.GetMonitorDevicePathCount()
                    .map_err(|e| e.to_string())?;

                for i in 0..count {
                    let monitor_id: PWSTR = wallpaper.GetMonitorDevicePathAt(i)
                        .map_err(|e| e.to_string())?;

                    let id_str = monitor_id.to_string()
                        .map_err(|e| e.to_string())?;
                    
                    if id_str == target_id {
                        wallpaper.SetWallpaper(PCWSTR(monitor_id.0), image_pcwstr)
                            .map_err(|e| e.to_string())?;
                        break;
                    }
                }
            }
        }
    }

    Ok("ok".to_string())
}