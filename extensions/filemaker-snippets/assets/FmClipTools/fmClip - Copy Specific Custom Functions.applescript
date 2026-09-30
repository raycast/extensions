-- fmClip - Copy Specific Custom Functions
-- version 2023-05-24

(*

	Takes whatever custom functions are in the clipboard, copies the existing custom functions from an ALREADY-OPEN Manage Custom Functions window in the "target" file, then removes whatever functions that target already has, then pastes.  

HISTORY: 
	2023-05-24 ( danshockley ): Added getFmAppProc to avoid being tied to one specific "FileMaker" app name, and to avoid going by the bundle ID. 
	2023-03-10 ( danshockley ): remove embedded fmObjectTranslator. 
	2023-02-07 ( danshockley ): first created. 

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
		
		
		-- get the list of desired function names:
		set dialogTitle to "Clipboard FileMaker - Copy Which Functions?"
		
		set searchForDialog to (display dialog "Enter the list of custom functions names you want to copy. The list can be return-delimited or comma-delimited." with title dialogTitle default answer "" buttons {"Cancel", "Copy"} default button "Copy")
		
		set desiredFunctionNames to text returned of searchForDialog
		set desiredFunctionNames to replaceSimple({desiredFunctionNames, ", ", return})
		set desiredFunctionNames to replaceSimple({desiredFunctionNames, ",", return})
		set desiredFunctionNames to paragraphs of desiredFunctionNames
		
		
		
		tell application "System Events"
			-- get the target's existing functions into the clipboard:
			set fmAppProc to my getFmAppProc()
			tell fmAppProc
				set frontmost to true
				set frontWinName to name of window 1
				if frontWinName does not start with winNameManageCFs then
					error "You must have the " & winNameManageCFs & " window open in your target database." number -1024
				end if
				delay 0.5
				
				(* NOTE: IDEALLY, we would select only the functions specified, but UI Scripting has a bug where setting selected=true for one row ALWAYS deselects other rows. So, instead we must SELECT ALL, COPY, REMOVE unwanted, SET CLIPBOARD. 
				*)
				click menu item "Select All" of menu "Edit" of menu bar 1
				click menu item "Copy" of menu "Edit" of menu bar 1
				delay 0.5
				
				
			end tell
		end tell
		
		
		-- make sure functions were copied:
		checkClipboardForObjects({}) of objTrans
		if currentCode of objTrans is not "XMFN" then
			error "The clipboard does not contain FileMaker custom functions - unable to copy existing functions." number -1024
		end if
		
		-- get the source functions:
		set sourceTextXML to clipboardGetObjectsasXML({}) of objTrans
		
		tell application "System Events"
			-- get the NAMEs of the source functions:
			set sourceXMLData to make new XML data with properties {text:sourceTextXML}
			set sourceFunctionNames to value of XML attribute "name" of (every XML element of XML element 1 of sourceXMLData whose name is "CustomFunction")
		end tell
		
		-- just the list of functions we do NOT want from the source:
		set removeFunctionNames to listRemoveFromFirstList({sourceFunctionNames, desiredFunctionNames})
		
		-- get the (possibly) reduced set of functions, then put only those desired objects into the clipboard:
		set justDesiredFunctionsXML to removeFunctions(sourceTextXML, removeFunctionNames)
		
		tell application "System Events"
			set (the clipboard) to justDesiredFunctionsXML
		end tell
		set convertResult to clipboardConvertToFMObjects({}) of objTrans
		
		return result
		
		
	on error errMsg number errNum
		if errNum is -128 then
			-- user canceled, so no need to show that to them.
		else
			display dialog errMsg
		end if
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


on listRemoveFromFirstList(prefs)
	-- version 1.2.1
	
	set {mainList, listOfItemsToRemove} to prefs
	
	set absentList to {}
	repeat with oneItem in mainList
		set oneItem to contents of oneItem
		if listOfItemsToRemove does not contain oneItem then copy oneItem to end of absentList
	end repeat
	
	return absentList
end listRemoveFromFirstList

on replaceSimple(prefs)
	-- version 1.4
	
	set defaultPrefs to {considerCase:true}
	
	if class of prefs is list then
		if (count of prefs) is greater than 3 then
			-- get any parameters after the initial 3
			set prefs to {sourceTEXT:item 1 of prefs, oldChars:item 2 of prefs, newChars:item 3 of prefs, considerCase:item 4 of prefs}
		else
			set prefs to {sourceTEXT:item 1 of prefs, oldChars:item 2 of prefs, newChars:item 3 of prefs}
		end if
		
	else if class of prefs is not equal to (class of {someKey:3}) then
		-- Test by matching class to something that IS a record to avoid FileMaker namespace conflict with the term "record"
		
		error "The parameter for 'replaceSimple()' should be a record or at least a list. Wrap the parameter(s) in curly brackets for easy upgrade to 'replaceSimple() version 1.3. " number 1024
		
	end if
	
	
	set prefs to prefs & defaultPrefs
	
	
	set considerCase to considerCase of prefs
	set sourceTEXT to sourceTEXT of prefs
	set oldChars to oldChars of prefs
	set newChars to newChars of prefs
	
	set sourceTEXT to sourceTEXT as string
	
	set oldDelims to AppleScript's text item delimiters
	set AppleScript's text item delimiters to the oldChars
	if considerCase then
		considering case
			set the parsedList to every text item of sourceTEXT
			set AppleScript's text item delimiters to the {(newChars as string)}
			set the newText to the parsedList as string
		end considering
	else
		ignoring case
			set the parsedList to every text item of sourceTEXT
			set AppleScript's text item delimiters to the {(newChars as string)}
			set the newText to the parsedList as string
		end ignoring
	end if
	set AppleScript's text item delimiters to oldDelims
	return newText
	
end replaceSimple







