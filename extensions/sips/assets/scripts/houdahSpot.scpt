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

on filterSelection:theSelection
	tell application "HoudahSpot"
		repeat with theItem in theSelection
			set filePath to path of theItem
			set dotIndex to (offset of "." in (reverse of text items of filePath as text)) - 1
			set fileExtension to text ((length of filePath) - dotIndex + 1) thru end of filePath as text

			if fileExtension is not "" then
				if dataWrapper's commonExtensions contains fileExtension then
					copy filePath to the end of dataWrapper's imagePaths
				else if dataWrapper's uncommonExtensions contains fileExtension then
					copy filePath to the end of dataWrapper's imagePaths
				else if dataWrapper's veryUncommonExtensions contains fileExtension then
					copy filePath to the end of dataWrapper's imagePaths
				else if dataWrapper's rareExtensions contains fileExtension then
					copy filePath to the end of dataWrapper's imagePaths
				end if
			end if
		end repeat
	end tell
end filterSelection:

if dataWrapper's imagePaths is not {} then
	set dataWrapper's imagePaths to {}
end if

try
	tell application "HoudahSpot"
		repeat with theWindow in windows
			set selectedItems to selection of document of theWindow
			if length of selectedItems > 0 then
				exit repeat
			end if
		end repeat
	end tell
	my filterSelection:selectedItems
on error number -1743
	set btn to button returned of (display alert "Permission Needed" message "To use Image Modification on selected images in HoudahSpot, you must allow Raycast to control HoudahSpot in System Settings > Privacy & Security > Automation." buttons {"Dismiss", "Open Privacy Settings"})
	if btn is "Open Privacy Settings" then
		open location "x-apple.systempreferences:com.apple.preference.security?Privacy_Automation"
	end if
end try

return dataWrapper's imagePaths