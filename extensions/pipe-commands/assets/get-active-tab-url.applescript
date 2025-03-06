tell application "System Events" to set frontApp to name of first process whose frontmost is true

if (frontApp = "Safari") or (frontApp = "Webkit") then
  using terms from application "Safari"
    tell application frontApp to return URL of front document
  end using terms from
else if (frontApp = "Google Chrome") or (frontApp = "Google Chrome Canary") or (frontApp = "Chromium") then
  using terms from application "Google Chrome"
    tell application frontApp to return URL of active tab of front window
  end using terms from
else if (frontApp = "Arc") then
    using terms from application "Arc"
        tell application frontApp to return URL of active tab of window 1
    end using terms from
else
    tell me to error "No supported browser is currently open."
end if
