export const APPS_SPACE_SCRIPT = `
tell application "Finder"
	set appList to {}
	set appFolders to every item of folder "Applications" of startup disk
	
	repeat with appFolder in appFolders
		if class of appFolder is application file then
			set appName to name of appFolder
			set appPath to POSIX path of (appFolder as alias)
			set appSize to do shell script "du -sh " & quoted form of appPath & " | cut -f1"
			set infoPlistPath to appPath & "Contents/Info.plist"
			try
				set iconFileName to do shell script "/usr/libexec/PlistBuddy -c 'Print CFBundleIconFile' '" & infoPlistPath & "'"
				if iconFileName does not end with ".icns" then
					set iconFileName to iconFileName & ".icns"
				end if
			on error
				set iconFileName to "AppIcon.icns"
			end try
			set iconPath to appPath & "Contents/Resources/" & iconFileName
			-- Check if the icon file actually exists
			try
				do shell script "test -f " & quoted form of iconPath
			on error
				set iconPath to "Icon not found"
			end try
			set end of appList to {name:appName, size:appSize, iconPath:iconPath}
		end if
	end repeat
	
	return appList
end tell
`

export const DISK_SPACE_SCRIPT = `tell application "System Events"
set startupDisk to name of startup disk

tell application "Finder"
	set free_bytes to (free space of disk startupDisk)
	set total_bytes to (capacity of disk startupDisk)
	
	set free_GB to (free_bytes / (1024 * 1024 * 1024))
	set total_GB to (total_bytes / (1024 * 1024 * 1024))
	
	-- Formatting the numbers to show two decimal places
	set free_space_formatted to (round free_GB * 100) / 100 as string
	set total_space_formatted to (round total_GB * 100) / 100 as string
	
	return free_space_formatted & " GB available of " & total_space_formatted & " GB"
end tell
end tell
`
