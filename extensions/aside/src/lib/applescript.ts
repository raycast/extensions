export const JSON_HELPERS = String.raw`
on replace_text(find_text, replacement_text, source_text)
  set previous_delimiters to AppleScript's text item delimiters
  set AppleScript's text item delimiters to find_text
  set source_items to every text item of source_text
  set AppleScript's text item delimiters to replacement_text
  set source_text to source_items as text
  set AppleScript's text item delimiters to previous_delimiters
  return source_text
end replace_text

on json_escape(value_to_escape)
  if value_to_escape is missing value then return ""
  set escaped_value to value_to_escape as text
  set escaped_value to my replace_text("\\", "\\\\", escaped_value)
  set escaped_value to my replace_text(quote, "\\\"", escaped_value)
  set escaped_value to my replace_text(character id 8, "\\b", escaped_value)
  set escaped_value to my replace_text(tab, "\\t", escaped_value)
  set escaped_value to my replace_text(linefeed, "\\n", escaped_value)
  set escaped_value to my replace_text(character id 12, "\\f", escaped_value)
  set escaped_value to my replace_text(return, "\\r", escaped_value)
  return escaped_value
end json_escape

on json_string(value_to_encode)
  return quote & my json_escape(value_to_encode) & quote
end json_string
`;

export const ENSURE_USABLE_WINDOW = String.raw`
set aside_was_running to application id "at.studio.AsideBrowser" is running
tell application id "at.studio.AsideBrowser"
  if not aside_was_running then launch
  repeat 30 times
    if (count of windows) > 0 then exit repeat
    delay 0.1
  end repeat
  if (count of windows) is 0 then make new window
  repeat 20 times
    if (count of windows) > 0 then exit repeat
    delay 0.1
  end repeat
  if (count of windows) is 0 then error "ASIDE_NO_WINDOW" number 2002
end tell
`;

export function appleScriptString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "\\r").replace(/\n/g, "\\n");
}
