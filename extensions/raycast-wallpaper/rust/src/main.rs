use raycast_rust_macros::raycast;
use windows::{
    Win32::{
        Foundation::POINT,
        Graphics::Gdi::{
            DISPLAY_DEVICEW, EnumDisplayDevicesW, GetMonitorInfoW, HMONITOR,
            MONITOR_DEFAULTTONEAREST, MONITORINFOEXW, MonitorFromPoint,
        },
        System::Com::{
            CLSCTX_ALL, COINIT_APARTMENTTHREADED, CoCreateInstance, CoInitializeEx, CoUninitialize,
        },
        UI::{
            Shell::{DesktopWallpaper, IDesktopWallpaper},
            WindowsAndMessaging::{EDD_GET_DEVICE_INTERFACE_NAME, GetCursorPos},
        },
    },
    core::PCWSTR,
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

// Balance COM initialization even when setting the wallpaper fails.
struct ComApartment;

impl Drop for ComApartment {
    fn drop(&mut self) {
        unsafe { CoUninitialize() };
    }
}

#[raycast]
fn set_wallpaper(image_path: String, mode: String) -> Result<String, String> {
    let target_device_id = match mode.as_str() {
        "current" => {
            Some(get_device_id_under_cursor().ok_or("Could not find the current monitor")?)
        }
        "every" => None,
        _ => return Err(format!("Unknown monitor mode: {mode}")),
    };
    let widestr: Vec<u16> = image_path
        .encode_utf16()
        .chain(std::iter::once(0))
        .collect();
    let target_widestr = target_device_id.map(|id| {
        id.encode_utf16()
            .chain(std::iter::once(0))
            .collect::<Vec<u16>>()
    });

    unsafe {
        CoInitializeEx(None, COINIT_APARTMENTTHREADED)
            .ok()
            .map_err(|e| e.to_string())?;
        let _apartment = ComApartment;
        let wallpaper: IDesktopWallpaper =
            CoCreateInstance(&DesktopWallpaper, None, CLSCTX_ALL).map_err(|e| e.to_string())?;
        let monitor_id = target_widestr
            .as_ref()
            .map_or(PCWSTR::null(), |id| PCWSTR(id.as_ptr()));
        wallpaper
            .SetWallpaper(monitor_id, PCWSTR(widestr.as_ptr()))
            .map_err(|e| e.to_string())?;
    }

    Ok("ok".to_string())
}
