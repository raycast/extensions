-- Clipboard XML to FileMaker Objects
-- version 4.0, Daniel A. Shockley, Erik Shagdar

-- 4.0 - 2018-04-04 ( dshockley/eshagdar ): load fmObjectTranslator code by reference instead of embedded.
-- 3.9.2 - 2017-08-09 ( eshagdar ): renamed 'Clipboard XML to FileMaker Objects' to 'fmClip - Clipboard XML to FM Objects' to match other handler name pattern
-- 1.8 - "clipboard convert" now ADDs the other data, not replace clipboard
-- 1.7 - handles UTF-8 properly now
-- 1.2 - cleaned up for use in Script menu



property debugMode : false

on run
	
	set objTrans to run script alias (((((path to me as text) & "::") as alias) as string) & "fmObjectTranslator.applescript")
	(* If you need a self-contained script, copy the code from fmObjectTranslator into this script and use the following instead of the run script step above:
			set objTrans to fmObjectTranslator_Instantiate({})
	*)
	
	set debugMode of objTrans to my debugMode
	
	if debugMode then log currentCode of objTrans
	
	set clipHasXML to checkClipboardForValidXML({}) of objTrans
	
	
	if clipHasXML is false then
		--		set the clipboard to ""
		set dialogMsg to "Could not identify the type of FileMaker data stored in database to send to the clipboard."
		
		try
			-- try to put the first XX characters of the clipboard into the error message
			set clipboardStartsWith to text 1 thru 20 of (get the clipboard as string) & "É"
			set dialogMsg to dialogMsg & return & "Clipboard starts with: " & clipboardStartsWith
		on error
			try
				set clipboardStartsWith to text 1 thru 8 of (get the clipboard as string) & "É"
				set dialogMsg to dialogMsg & return & "Clipboard starts with: " & clipboardStartsWith
			end try
		end try
		-- display dialog dialogMsg
		return dialogMsg
	end if
	
	clipboardConvertToFMObjects({}) of objTrans
	
	return result
	
end run



