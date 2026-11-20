import { Toast, open, showToast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import type { UsbDevice } from "./usb";

/**
 * Opens System Information → USB and selects the given device.
 * System Information has no URL scheme or AppleScript dictionary for this, so it's done with
 * UI scripting (needs Accessibility permission for Raycast).
 *
 * Matching: the Location ID in each row's detail text must equal ours (System Information shows the
 * same IDs as ioreg). Rows with a matching name are tried first (alphanumerics only, so "10_100" ==
 * "10/100"), then hub rows, which System Information labels "Removable"/"Non-removable".
 */
const SCRIPT = `
on norm(s)
	set out to ""
	repeat with ch in (characters of s)
		set c to (id of ch)
		if (c ≥ 48 and c ≤ 57) or (c ≥ 97 and c ≤ 122) then
			set out to out & ch
		else if (c ≥ 65 and c ≤ 90) then
			set out to out & (character id (c + 32))
		end if
	end repeat
	return out
end norm

on detailText(w)
	tell application "System Events" to tell process "System Information"
		try
			return value of text area 1 of scroll area 2 of splitter group 1 of splitter group 1 of w
		end try
	end tell
	return ""
end detailText

-- A hub's detail text also lists its children, so only its first Location ID line is its own.
on ownLocation(t)
	repeat with ln in paragraphs of t
		if ln contains "Location ID:" then return last word of ln
	end repeat
	return ""
end ownLocation

-- Select a row and wait for the detail pane to change; "" means it never changed (row has no details).
on selectAndRead(w, r, prevText)
	tell application "System Events" to tell process "System Information" to select r
	repeat 8 times
		delay 0.06
		set t to my detailText(w)
		if t is not prevText then return t
	end repeat
	return ""
end selectAndRead

on run argv
	set targetName to my norm(item 1 of argv)
	set loc to item 2 of argv
	tell application "System Information" to activate
	tell application "System Events" to tell process "System Information"
		repeat 50 times
			if (count of windows) > 0 then exit repeat
			delay 0.1
		end repeat
		set w to window 1
		set sb to outline 1 of scroll area 1 of splitter group 1 of w
		repeat with r in rows of sb
			try
				if (value of text field 1 of r) is "USB" then
					select r
					exit repeat
				end if
			end try
		end repeat
		set tree to missing value
		repeat 50 times
			try
				set tree to outline 1 of scroll area 1 of splitter group 1 of splitter group 1 of w
				if (count of rows of tree) > 0 then exit repeat
			end try
			delay 0.1
		end repeat
		if tree is missing value then return "no-tree"

		-- Expand the whole tree.
		set lastCount to -1
		repeat 12 times
			set n to count of rows of tree
			if n = lastCount then exit repeat
			set lastCount to n
			repeat with r in rows of tree
				try
					if value of attribute "AXDisclosing" of r is false then set value of attribute "AXDisclosing" of r to true
				end try
			end repeat
			delay 0.15
		end repeat

		-- Candidates: rows with the device's name first, then hub rows (listed as "Removable"/"Non-removable"), then the rest.
		set nameHits to {}
		set hubRows to {}
		set otherRows to {}
		repeat with r in rows of tree
			set nm to ""
			try
				set nm to value of text field 1 of r
			end try
			if my norm(nm) is targetName then
				set end of nameHits to contents of r
			else if nm is "Removable" or nm is "Non-removable" then
				set end of hubRows to contents of r
			else if nm does not end with " Bus" and nm is not "Built-in" then
				set end of otherRows to contents of r
			end if
		end repeat

		if (count of nameHits) = 1 and loc is "" then
			select item 1 of nameHits
			return "ok"
		end if

		-- Reset the pane to a known state so stale text can't fake a match.
		select row 1 of tree
		delay 0.15
		set prevText to my detailText(w)
		repeat with r in (nameHits & hubRows & otherRows)
			set t to my selectAndRead(w, r, prevText)
			if t is not "" then
				set prevText to t
				if loc is "" or (my ownLocation(t)) is loc then
					try
						perform action "AXScrollToVisible" of r
					end try
					return "ok"
				end if
			end if
		end repeat
		-- Only without a location ID is a same-named row good enough; otherwise it may be a different device.
		if loc is "" and (count of nameHits) > 0 then
			select item 1 of nameHits
			return "ok"
		end if
		return "not-found"
	end tell
end run
`;

export type SysInfoResult = "ok" | "not-found" | "no-tree";

export async function revealInSystemInformation(d: UsbDevice): Promise<SysInfoResult> {
  const loc = d.locationId !== undefined ? "0x" + d.locationId.toString(16).padStart(8, "0") : "";
  const res = await runAppleScript(SCRIPT, [d.name, loc], { timeout: 20_000 });
  return (res.trim() as SysInfoResult) || "ok";
}

export const ACCESSIBILITY_SETTINGS = "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility";
export const AUTOMATION_SETTINGS = "x-apple.systempreferences:com.apple.preference.security?Privacy_Automation";

export async function showInSystemInformation(d: UsbDevice) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Finding it in System Information…" });
  try {
    const res = await revealInSystemInformation(d);
    if (res === "ok") {
      toast.hide();
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = res === "not-found" ? "Device not found in System Information" : "Couldn't open the USB section";
      toast.message = "It may have been unplugged, or System Information hasn't refreshed (⌘R there).";
    }
  } catch (e) {
    const msg = (e as Error).message ?? "";
    toast.style = Toast.Style.Failure;
    // Two separate macOS permissions are involved; tell them apart instead of guessing.
    if (/-1743|not authorized to send apple events/i.test(msg)) {
      toast.title = "Raycast needs Automation access to System Events";
      toast.message = "System Settings → Privacy & Security → Automation → Raycast → turn on System Events";
      toast.primaryAction = { title: "Open Automation Settings", onAction: () => open(AUTOMATION_SETTINGS) };
    } else if (/-25211|-1728.*assistive|assistive access/i.test(msg)) {
      toast.title = "Raycast needs Accessibility access";
      toast.message = "System Settings → Privacy & Security → Accessibility → turn on Raycast";
      toast.primaryAction = { title: "Open Accessibility Settings", onAction: () => open(ACCESSIBILITY_SETTINGS) };
    } else {
      toast.title = "Couldn't select the device";
      toast.message = msg;
    }
  }
}
