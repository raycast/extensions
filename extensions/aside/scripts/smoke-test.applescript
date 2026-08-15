set test_window to missing value
set test_tab to missing value

try
  using terms from application "Aside"
    tell application id "at.studio.AsideBrowser"
      set aside_version to version as text
      set test_window to make new window with properties {mode:"incognito"}
      set test_window_id to id of test_window as text
      if mode of test_window is not "incognito" then error "Window mode did not match"

      set test_tab to make new tab at end of tabs of test_window with properties {URL:"https://example.com/?aside-raycast-smoke=1"}
      set test_tab_id to id of test_tab as text
      if test_tab_id is "" or test_window_id is "" then error "Native IDs were empty"
      set test_tab_title to title of test_tab as text
      set test_tab_loading to loading of test_tab as boolean

      set active tab index of test_window to (count of tabs of test_window)
      reload test_tab
      if URL of test_tab does not start with "https://example.com/" then error "Tab URL did not match"

      close test_tab
      set test_tab to missing value
      close test_window
      set test_window to missing value

      set bookmark_root_count to 0
      try
        if bookmarks bar exists then set bookmark_root_count to bookmark_root_count + 1
      end try
      try
        if other bookmarks exists then set bookmark_root_count to bookmark_root_count + 1
      end try
    end tell
  end using terms from

  return "{\"ok\":true,\"version\":\"" & aside_version & "\",\"nativeIds\":true,\"incognito\":true,\"tabProperties\":true,\"tabActions\":true,\"bookmarkRoots\":" & bookmark_root_count & "}"
on error error_message number error_number
  try
    using terms from application "Aside"
      tell application id "at.studio.AsideBrowser"
        if test_tab is not missing value then close test_tab
        if test_window is not missing value then close test_window
      end tell
    end using terms from
  end try
  error error_message number error_number
end try
