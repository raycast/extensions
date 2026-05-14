#@osa-lang:AppleScript
use AppleScript version "2.4"
use scripting additions

script dataWrapper
	property commonExtensions : {"png", "jpg", "jpeg", "webp", "pdf"}
	property uncommonExtensions : {"psd", "tiff", "heif", "heic", "gif", "svg", "icns", "avif", "bmp"}
	property veryUncommonExtensions : {"tif", "heifs", "heics", "ico", "astc", "dds", "exr", "ktx", "pbm", "pvr", "tga"}
	property rareExtensions : {"pgm", "ppm", "pnm", "pfm", "dib", "hif", "acvi", "acvs", "jp2", "j2c", "jpf", "j2k", "jpx"}
	property imagePaths : {}
end script

on filterSelection:theItems
	tell application "Finder"
		repeat with i from 1 to count of theItems
			set itemData to {ext:name extension, ppath:POSIX path} of item i of theItems
			if ext of itemData is not "" then
				if dataWrapper's commonExtensions contains ext of itemData then
					copy ppath of itemData to the end of dataWrapper's imagePaths
				else if dataWrapper's uncommonExtensions contains ext of itemData then
					copy ppath of itemData to the end of dataWrapper's imagePaths
				else if dataWrapper's veryUncommonExtensions contains ext of itemData then
					copy ppath of itemData to the end of dataWrapper's imagePaths
				else if dataWrapper's rareExtensions contains ext of itemData then
					copy ppath of itemData to the end of dataWrapper's imagePaths
				end if
			end if
		end repeat
	end tell
end filterSelection:

if dataWrapper's imagePaths is not {} then
	set dataWrapper's imagePaths to {}
end if

try
	tell application "Finder" to set selectedItems to selection as alias list
	my filterSelection:selectedItems
on error number errorNumber
	if errorNumber = -1743 then
		set userResponse to display alert "Permission Required" message "To use Image Modification on selected images in Finder, you must allow Raycast to control Finder in System Settings > Privacy & Security > Automation." buttons {"Dismiss", "Open Privacy Settings"}
		if userResponse's button returned = "Open Privacy Settings" then
			open location "x-apple.systempreferences:com.apple.preference.security?Privacy_Automation"
		end if
	end if
end try

return dataWrapper's imagePaths