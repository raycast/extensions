(*
  ntfctl-clear.applescript
  ────────────────────────
  Clear all visible macOS Notification Center banners.
  Tries three strategies in order:
    1. Click the "Clear All" / "Clear" button at the top (fastest)
    2. Click individual per-notification dismiss ("X") buttons
    3. Fall back to restarting the notification UI

  Bind this to a global hotkey for instant notification cleanup
  without reaching for the trackpad.

  Dependencies: macOS Notification Center (UI Scripting)
  Tested on:    macOS 15 (Sequoia), macOS 26 (Tahoe)
*)

use AppleScript version "2.5"
use scripting additions

tell application "System Events"
    (* ── Open Notification Center ── *)
    tell process "ControlCenter"
        click menu bar item 2 of menu bar 1
    end tell
    delay 0.7

    tell process "NotificationCenter"
        try
            set ncWindow to item 1 of (every window)
        on error
            return
        end try

        try
            set allElements to entire contents of ncWindow
        on error
            tell process "ControlCenter"
                click menu bar item 2 of menu bar 1
            end tell
            return
        end try

        set dismissed to 0

        (* ── Strategy 1: Look for "Clear All" / "Clear" button ── *)
        -- The button title varies by language:
        --   English: "Clear All" or "Clear"
        --   Others:  "Alle löschen", "Tout effacer", "Borrar todo", etc.
        -- We look for any button whose title/description contains these keywords
        -- OR whose title starts with "Clear" (English) / "Alle" (German) / etc.
        set clearKeywords to {"Clear All", "Clear", "Alle löschen", "Tout effacer", ¬
            "Borrar todo", "すべてクリア", "모두 지우기", "全部清除", ¬
            "Очистить все", "Limpar Tudo", "Usuń wszystko"}

        repeat with elem in allElements
            if role of elem is "AXButton" then
                try
                    set elemTitle to title of elem
                on error
                    set elemTitle to ""
                end try
                try
                    set elemDesc to description of elem
                on error
                    set elemDesc to ""
                end try

                -- Check if this button's title/description matches any clear keyword
                repeat with kw in clearKeywords
                    if elemTitle contains kw or elemDesc contains kw then
                        click elem
                        set dismissed to 1
                        exit repeat
                    end if
                end repeat
            end if
            if dismissed > 0 then exit repeat
        end repeat

        (* ── Strategy 2: Click individual dismiss "X" buttons ── *)
        if dismissed is 0 then
            repeat with elem in allElements
                if role of elem is not "AXButton" then
                    -- skip
                else
                    try
                        set btnSize to size of elem
                        set btnW to item 1 of btnSize
                        set btnH to item 2 of btnSize
                        -- Dismiss buttons are ~20×20 px
                        if btnW ≤ 28 and btnH ≤ 28 then
                            set btnPos to position of elem
                            set btnY to item 2 of btnPos
                            -- NC close button is at y ≈ 26; real dismiss buttons are > 30
                            if btnY > 30 then
                                click elem
                                set dismissed to dismissed + 1
                                delay 0.15
                            end if
                        end if
                    end try
                end if
            end repeat
        end if

        (* ── Strategy 3: Restart Notification Center ── *)
        if dismissed is 0 then
            do shell script "killall NotificationCenter 2>/dev/null; true"
        end if
    end tell

    (* ── Close Notification Center ── *)
    delay 0.3
    tell process "ControlCenter"
        click menu bar item 2 of menu bar 1
    end tell
end tell
