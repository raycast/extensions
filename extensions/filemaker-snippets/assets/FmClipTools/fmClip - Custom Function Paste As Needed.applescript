-- fmClip - Custom Function Paste As Needed
-- version 2023-05-24

(*

	Takes whatever custom functions are in the clipboard, copies the existing custom functions from an ALREADY-OPEN Manage Custom Functions window in the "target" file, then removes whatever functions that target already has, then pastes.  

HISTORY: 
	2023-05-24 ( danshockley ): Added getFmAppProc to avoid being tied to one specific "FileMaker" app name. 
	2022-08-16 ( danshockley ): first created. 

*)

use AppleScript version "2.4" -- Yosemite (10.10) or later
use framework "Foundation"
use scripting additions

property winNameManageCFs : "Manage Custom Functions"
property snippetHead : "<fmxmlsnippet type=\"FMObjectList\">"
property snippetFoot : "</fmxmlsnippet>"

on run
	
	try
		
		-- load the translator library:
		set transPath to (((((path to me as text) & "::") as alias) as string) & "fmObjectTranslator.applescript")
		set objTrans to run script (transPath as alias)
		(* If you need a self-contained script, copy the code from fmObjectTranslator into this script and use the following instead of the run script step above:
			set objTrans to fmObjectTranslator_Instantiate({})
		*)
		
		-- check for source functions:
		checkClipboardForObjects({}) of objTrans
		if currentCode of objTrans is not "XMFN" then
			error "The clipboard does not contain FileMaker custom functions." number -1024
		end if
		
		-- get the source functions:
		set sourceTextXML to clipboardGetObjectsasXML({}) of objTrans
		
		tell application "System Events"
			-- get the NAMEs of the source functions:
			set origSourceXMLData to make new XML data with properties {text:sourceTextXML}
			set origFunctionNames to value of XML attribute "name" of (every XML element of XML element 1 of origSourceXMLData whose name is "CustomFunction")
			
			-- get the target's existing functions into the clipboard:
			set fmAppProc to my getFmAppProc()
			tell fmAppProc
				set frontmost to true
				set frontWinName to name of window 1
				if frontWinName does not start with winNameManageCFs then
					error "You must have the " & winNameManageCFs & " window open in your target database." number -1024
				end if
				
				click menu item "Select All" of menu "Edit" of menu bar 1
				click menu item "Copy" of menu "Edit" of menu bar 1
				delay 0.5
			end tell
		end tell
		
		-- now, read out what functions the target already has:
		checkClipboardForObjects({}) of objTrans
		set targetTextXML to clipboardGetObjectsasXML({}) of objTrans
		tell application "System Events"
			set targetXMLData to make new XML data with properties {text:targetTextXML}
			set targetFunctionNames to value of XML attribute "name" of (every XML element of XML element 1 of targetXMLData whose name is "CustomFunction")
		end tell
		
		-- get the (possibly) reduced set of functions, then put those in clipboard:
		set justFunctionsXML to removeFunctions(sourceTextXML, targetFunctionNames)
		set the clipboard to justFunctionsXML
		
		set convertResult to clipboardConvertToFMObjects({}) of objTrans
		
		-- PASTE only the needed functions:
		tell application "System Events"
			tell fmAppProc
				set frontmost to true
				delay 0.5
				click menu item "Paste" of menu "Edit" of menu bar 1
			end tell
		end tell
		
		return convertResult
		
	on error errMsg number errNum
		display dialog errMsg
		return false
	end try
	
	
end run

on getFmAppProc()
	-- version 2023-05-24
	-- Gets the frontmost "FileMaker" app (if any), otherwise the 1st one available.
	tell application "System Events"
		set fmAppProc to first application process whose frontmost is true
		if name of fmAppProc does not contain "FileMaker" then
			-- frontmost is not FileMaker, so just get the 1st one we can find 
			-- (if multiple copies running, must make the one you want is frontmost to be sure it is used)
			try
				set fmAppProc to get first application process whose name contains "FileMaker"
			on error errMsg number errNum
				if errNum is -1719 then return false
				error errMsg number errNum
			end try
		end if
		return fmAppProc
	end tell
end getFmAppProc


on removeFunctions(sourceStringXML, removeNames)
	
	-- now, generate a (possibly) REDUCED XML block:
	set {theXMLDoc, theError} to current application's NSXMLDocument's alloc()'s initWithXMLString:sourceStringXML options:0 |error|:(reference)
	if theXMLDoc is missing value then error (theError's localizedDescription() as text)
	set snippetNode to theXMLDoc's childAtIndex:0
	set sourceCount to snippetNode's childCount as integer
	set newXML to snippetHead
	repeat with nodeIndex from 0 to sourceCount - 1
		set oneNode to (snippetNode's childAtIndex:nodeIndex)
		set nameAttr to (oneNode's attributeForName:"name")
		set functionName to nameAttr's stringValue as text
		if functionName is not in removeNames then
			set functionXML to oneNode's XMLString as text
			set newXML to newXML & return & functionXML
		end if
	end repeat
	set newXML to newXML & return & snippetFoot
	
	return newXML
	
end removeFunctions





