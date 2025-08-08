use windows::{
    core::{PCWSTR, PWSTR, Result},
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

fn main() -> Result<()> {
    let args: Vec<String> = std::env::args().collect();
    if args.len() != 3 {
        eprintln!("Usage: {} <image_path> <every|current>", args[0]);
        std::process::exit(1);
    }

    let image_path = &args[1];
    let mode = &args[2].to_lowercase();

    let widestr: Vec<u16> = image_path.encode_utf16().chain(std::iter::once(0)).collect();
    let image_pcwstr = PCWSTR(widestr.as_ptr());

    let target_device_id = if mode == "current" {
        get_device_id_under_cursor()
    } else {
        None
    };

    unsafe {
        CoInitializeEx(None, COINIT_APARTMENTTHREADED).ok()?;
        let wallpaper: IDesktopWallpaper = CoCreateInstance(&DesktopWallpaper, None, CLSCTX_ALL)?;

        let count = wallpaper.GetMonitorDevicePathCount()?;

        for i in 0..count {
            let monitor_id: PWSTR = wallpaper.GetMonitorDevicePathAt(i)?;

            let id_str = monitor_id.to_string()?;
            if id_str.trim().is_empty() {
                println!("Monitor {i}: Skipped (empty ID)");
                continue;
            }

            let matches = target_device_id.as_ref().map_or(true, |target| id_str == *target);

            if matches {
                println!("Setting wallpaper on monitor {i}: {id_str}");
                wallpaper.SetWallpaper(PCWSTR(monitor_id.0), image_pcwstr)?;
            } else {
                println!("Monitor {i}: Skipped (no match)");
            }
        }
    }

    Ok(())
}
