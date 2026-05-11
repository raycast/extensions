use windows::Win32::UI::WindowsAndMessaging::ShowCursor;

/// Hide the system cursor completely
/// 
/// Windows maintains a display counter for the cursor.
/// This function decrements the counter until it's negative (cursor hidden).
pub unsafe fn hide_cursor() {
    let mut counter = ShowCursor(false);
    while counter >= 0 {
        counter = ShowCursor(false);
    }
}

/// Show the system cursor
/// 
/// Windows maintains a display counter for the cursor.
/// This function increments the counter until it's non-negative (cursor visible).
pub unsafe fn show_cursor() {
    let mut counter = ShowCursor(true);
    while counter < 0 {
        counter = ShowCursor(true);
    }
}
