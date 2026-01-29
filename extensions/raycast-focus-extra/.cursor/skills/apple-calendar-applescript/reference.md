# Apple Calendar script examples

## AppleScript: create one event

```applescript
tell application "Calendar"
  tell calendar "Work"
    make new event with properties {summary:"Focus session", start date:(current date), end date:((current date) + 30 * minutes)}
  end tell
end tell
```

## JXA (JavaScript for Automation): create event with explicit dates

Use `runAppleScript(script, [], { language: "JavaScript" })`. In JXA, use `Application("Calendar")` and create event with `startDate`/`endDate` (JavaScript Date or AppleScript date string). Check Raycast runAppleScript docs for passing args and parsing output.
