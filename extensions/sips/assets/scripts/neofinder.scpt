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
	repeat with itemPath in theItems
		set itemPath to itemPath as text
		set AppleScript's text item delimiters to "."
		set ext to last text item of itemPath

		if ext is not "" then
			if dataWrapper's commonExtensions contains ext then
				copy itemPath to the end of dataWrapper's imagePaths
			else if dataWrapper's uncommonExtensions contains ext then
				copy itemPath to the end of dataWrapper's imagePaths
			else if dataWrapper's veryUncommonExtensions contains ext then
				copy itemPath to the end of dataWrapper's imagePaths
			else if dataWrapper's rareExtensions contains ext then
				copy itemPath to the end of dataWrapper's imagePaths
			end if
		end if
	end repeat
end filterSelection:

if dataWrapper's imagePaths is not {} then
	set dataWrapper's imagePaths to {}
end if

try
	tell application "NeoFinder" to set selectedItems to finder path of selected items
	my filterSelection:selectedItems
on error number -1743
	set btn to button returned of (display alert "Permission Needed" message "To use Image Modification on selected images in NeoFinder, you must allow Raycast to control NeoFinder in System Settings > Privacy & Security > Automation." buttons {"Dismiss", "Open Privacy Settings"})
	if btn is "Open Privacy Settings" then
		open location "x-apple.systempreferences:com.apple.preference.security?Privacy_Automation"
	end if
end try

return dataWrapper's imagePaths