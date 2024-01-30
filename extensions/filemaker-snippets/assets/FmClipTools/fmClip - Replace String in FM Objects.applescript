-- Clipboard - Replace String in FileMaker Objects
-- version 4.1, Daniel A. Shockley, Erik Shagdar
-- Translates FileMaker clipboard objects to XML, performs a string replace within, then back to objects.

-- 4.1 - 2018-09-14 ( dshockley/eshagdar ): Added ability to have return-delimited list of multiple search-and-replace pairs. 
-- 4.0 - 2018-04-04 ( dshockley/eshagdar ): Load fmObjectTranslator code by reference instead of embedded. 
-- 3.9.2 - 2017-08-09 ( eshagdar ): Renamed 'Clipboard - Replace String in FileMaker Objects' to 'fmClip - Replace String in FM Objects' to match other handler name pattern. 
-- 3.7 - Show count when choosing ReplaceWith and then immediately replace (no 3rd dialog). 
-- 3.1.1 - The Replace With dialog now shows what you just chose to SearchFor. 
-- 2.7 - Fixed parameter calls to replaceSimple and patternCount (multi-params => list). 
-- 2.3 - Turn off prettify, since not needed (XML is intermediary only). 
-- 1.8 - The "clipboard convert" now ADDs the other data, not replace clipboard. 
-- 1.7 - Handles UTF-8 properly now. 


property debugMode : false

on run
	
	
	set objTrans to run script alias (((((path to me as text) & "::") as alias) as string) & "fmObjectTranslator.applescript")
	(* If you need a self-contained script, copy the code from fmObjectTranslator into this script and use the following instead of the run script step above:
			set objTrans to fmObjectTranslator_Instantiate({})
	*)
	
	
	set shouldPrettify of objTrans to false
	
	set debugMode of objTrans to debugMode
	
	set clipboardType to checkClipboardForObjects({}) of objTrans
	
	if clipboardType is false then
		display dialog "The clipboard did not contain any FileMaker objects."
		return false
	end if
	
	set clipboardObjectStringXML to clipboardGetObjectsAsXML({}) of objTrans
	
	
	set dialogTitle to "Clipboard FileMaker Objects Search and Replace"
	
	set searchForDialog to (display dialog "Enter the text that should be searched for (and then replaced). You can use a return-delimited SearchList if you want to replace multiple items: " with title dialogTitle default answer "" buttons {"Cancel", "SearchList", "SearchFor"} default button "SearchFor")
	
	set searchFor to text returned of searchForDialog
	set multiSearch to (button returned of searchForDialog) = "SearchList"
	
	
	if multiSearch then
		set searchList to paragraphs of searchFor
		set countSearch to count of searchList
		-- Ask for ReplaceList:
		set replaceWithDialog to (display dialog "Enter your return-delimited list of " & countSearch & " Replace items:" with title dialogTitle default answer "" buttons {"Cancel", "ReplaceList"} default button "ReplaceList")
		
		set replaceList to text returned of replaceWithDialog
		set replaceList to paragraphs of replaceList
		set countReplace to count of replaceList
		
		-- ERROR if count of ReplaceList doesn't match SearchList
		if countReplace is not equal to countSearch then error "Your search list had " & countSearch & " items while your replace list had " & countReplace & " items. They need to match!" number -1024
		
		
		
		set newXML to clipboardObjectStringXML
		repeat with indexSearch from 1 to countSearch
			if debugMode then log indexSearch
			set searchFor to contents of (item indexSearch of searchList)
			if debugMode then log searchFor
			set replaceWith to contents of (item indexSearch of replaceList)
			if debugMode then log replaceWith
			
			set foundCount to patternCount({clipboardObjectStringXML, searchFor}) of objTrans
			if debugMode then log foundCount
			
			set newXML to replaceSimple({newXML, searchFor, replaceWith}) of objTrans
			
		end repeat
		
	else
		-- single Search item:
		set foundCount to patternCount({clipboardObjectStringXML, searchFor}) of objTrans
		
		set replaceWithDialog to (display dialog "There are " & foundCount & " occurrences of \"" & searchFor & "\" in your clipboard. What should they all be replaced with?" with title dialogTitle default answer "" buttons {"Cancel", "Replace With"} default button "Replace With")
		
		set replaceWith to text returned of replaceWithDialog
		
		
		set newXML to replaceSimple({clipboardObjectStringXML, searchFor, replaceWith}) of objTrans
		
	end if
	
	set the clipboard to newXML
	
	clipboardConvertToFMObjects({}) of objTrans
	
	return newXML
	
end run





