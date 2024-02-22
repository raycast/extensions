-- Paste missing ( and update outdated ) functions from the clipboard into the currently open 'Manage Custom Functions' window in FileMaker. 
-- Erik Shagdar, NYHTC


(*
NOTES:
	- You can have either FileMaker custom function objects or Custom Function XML in your clipboard
	- requires you to have "htcLib" compiled [https://github.com/NYHTC/applescript-fm-helper]
	- if you want to have HTC's standard functions, it is assumed that the repo exists at '~/code/' [https://github.com/NYHTC/fm-functions]
	
	
HISTORY:
	2019-12-19 ( eshagdar ): display dialog if there's an error. Have the user confirm prior to pasting.
	2019-12-11 ( eshagdar ): created
*)




on run
	
	try
		--init
		set handlerName to "Smart Paste Functions"
		tell application "htcLib" to set frontFMWinName to fmGUI_NameOfFrontmostWindow()
		if frontFMWinName does not start with "Manage Custom Functions for" then error "You must have 'Manage Custom Funcions' window already open" number -1024
		tell application "htcLib" to set dbName to getTextBetween({sourceTEXT:frontFMWinName, beforeText:"Ò", afterText:"Ó"})
		
		tell application "FmObjectTranslator" to set fmObjTrans to fmObjectTranslator_Instantiate({})
		
		set xmlSnippetHeader to "<fmxmlsnippet type=\"FMObjectList\">"
		set xmlSnippetFooter to "</fmxmlsnippet>"
		set xmlSnippetFuncStart to "<CustomFunction "
		set xmlSnippetFuncEnd to "</CustomFunction>"
		set xmlSnippetCDATAStart to "<![CDATA["
		set xmlSnippetCDATAEnd to "]]>"
		
		
		
		-- DEBUGGING -- force the clipboard to be the standard functions, ignoring what's in your clipboard
		set debug_readFromRepo to false
		if debug_readFromRepo then
			tell application "Finder" to set debug_posixFolderPath to POSIX path of (((get container of (path to desktop folder)) as string) & "code:fm-functions:functions:")
			set funcXML_clip to readStandardFunctionsAsXMLText({posixFolderPath:debug_posixFolderPath, xmlSnippetHeader:xmlSnippetHeader, xmlSnippetFooter:xmlSnippetHeader})
			set the clipboard to funcXML_clip
		end if
		
		
		-- grab functions XML from clipboard ( if fm-functions are in the clipboard, then convert them )
		set clipboardType to checkClipboardForObjects({}) of fmObjTrans
		if currentCode of fmObjTrans is "XMFN" then clipboardConvertToXML({}) of fmObjTrans
		set funcXML_clip to the clipboard
		--todo expects the clipboard to contain XML of FileMaker custom functions ( without leading/trailing whitespace ). There may be a better way to test for this...
		if funcXML_clip does not start with xmlSnippetHeader Â
			or funcXML_clip does not end with xmlSnippetFooter Â
			or funcXML_clip does not contain xmlSnippetFuncStart Â
			or funcXML_clip does not contain xmlSnippetFuncEnd Â
			or funcXML_clip does not contain xmlSnippetCDATAStart Â
			then error "You do not have any FileMaker custom functions in your clipboard." number -1024
		tell application "htcLib" to set numClipFunctions to patternCount({sourceTEXT:funcXML_clip, searchString:xmlSnippetFuncStart, considerCase:false})
		activate
		display dialog "Do you want smart paste/update " & numClipFunctions & " custom functions into " & dbName & "?" with title handlerName buttons {"Paste", "Cancel"} default button "Paste"
		
		
		-- read functions for the currently open FM functions
		tell application "htcLib" to set functionNames to fmGUI_CustomFunctions_FunctionNames({})
		if length of functionNames is 0 then
			set funcXML_fm to ""
		else
			tell application "htcLib" to fmGUI_SelectAllAndCopy()
			clipboardConvertToXML({}) of fmObjTrans
			set funcXML_fm to the clipboard
			tell application "System Events" to set funcXMLObj_fm to make new XML data with properties {text:funcXML_fm}
		end if
		
		
		-- loop through and determine missing/outdated functions
		-- todo how to deal with functions whose version should be locked/not updated
		tell application "htcLib" to set funcListXML_clip to parseByTags({sourceTEXT:funcXML_clip, itemStartStr:xmlSnippetFuncStart, itemEndStr:xmlSnippetFuncEnd, includeMarkers:true})
		set updateListXML to {}
		repeat with i from 1 to count of funcListXML_clip
			set oneFuncXML_clip to item i of funcListXML_clip
			tell application "System Events"
				set oneFuncObj_clip to make new XML data with properties {text:oneFuncXML_clip}
				set oneFuncName_clip to value of XML attribute "name" of XML element 1 of oneFuncObj_clip
			end tell
			try
				--find out the item number ( instance ) of the function in FM since we need to compare that to what's in the clipboard
				tell application "System Events" to set oneRefXML_fm to (first XML element of XML element 1 of funcXMLObj_fm whose value of XML attribute "name" is equal to oneFuncName_clip)
				set oneFuncNumRefXML_fm to (word 3 of coerceToString(oneRefXML_fm)) as integer
				
				
				-- check if the functions are exactly the same ( just the CDATA since the ids will be different )
				tell application "htcLib"
					set oneFuncXML_fm to getTextBetween({sourceTEXT:funcXML_fm, beforeText:xmlSnippetFuncStart, afterText:xmlSnippetFuncEnd, textItemNum:oneFuncNumRefXML_fm + 1, includeMarkers:true})
					set oneFlatFunc_fm to removeAllWhitespace({str:getTextBetween({sourceTEXT:oneFuncXML_fm, beforeText:xmlSnippetCDATAStart, afterText:xmlSnippetCDATAEnd})})
					set oneFlatFunc_clip to removeAllWhitespace({str:getTextBetween({sourceTEXT:oneFuncXML_clip, beforeText:xmlSnippetCDATAStart, afterText:xmlSnippetCDATAEnd})})
				end tell
				
				
				-- if not the same, needs update
				-- todo check versions, only add if newer in clipboard, if newer in FM then notify
				if oneFlatFunc_fm is not equal to oneFlatFunc_clip then copy oneFuncXML_clip to end of updateListXML
				
				
				-- function exists ( but may need update ), so remove from list
				set item i of funcListXML_clip to ""
			on error errMsg number errNum
				--function missing, so leave it alone
			end try
		end repeat
		
		
		-- paste missing functions
		tell application "htcLib" to set missingFuncXML to unParseChars({funcListXML_clip}, "")
		if length of missingFuncXML is greater than 0 then
			set missingFuncXML to xmlSnippetHeader & missingFuncXML & xmlSnippetFooter
			set the clipboard to missingFuncXML
			if checkClipboardForValidXML({}) of fmObjTrans is false then error "failed to set the clipboard to XML of custom functions" number -1024
			clipboardConvertToFMObjects({}) of fmObjTrans
			tell application "htcLib" to fmGUI_PasteFromClipboard()
		end if
		
		
		--update outdated functions
		repeat with i from 1 to count of updateListXML
			set oneUpdateFuncXML to item i of updateListXML
			tell application "System Events"
				set oneUpdateFuncObj to make new XML data with properties {text:oneUpdateFuncXML}
				set oneUpdateFunc_name to value of XML attribute "name" of XML element 1 of oneUpdateFuncObj
				set oneUpdateFunc_paramStr to value of XML attribute "parameters" of XML element 1 of oneUpdateFuncObj
				set oneUpdateFunc_cdata to value of XML element 1 of XML element 1 of oneUpdateFuncObj
			end tell
			
			tell application "htcLib"
				set oneUpdateFunc_paramList to parseChars({sourceTEXT:oneUpdateFunc_paramStr, parseString:";"})
				fmGUI_CustomFunctions_EditFunction({functionName:oneUpdateFunc_name, parameterList:oneUpdateFunc_paramList, calcCode:oneUpdateFunc_cdata})
			end tell
		end repeat
		
		
		return true
	on error errMsg number errNum
		display dialog errMsg with title handlerName buttons {"OK"} default button "OK"
	end try
end run



on readStandardFunctionsAsXMLText(prefs)
	-- read XML text of all the functions from fm-functions repo
	-- version 2019-12-11, Erik Shagdar, NYHTC
	
	-- deal with prefs
	set prefs to prefs & {posixFolderPath:null, fileEncoding:Çclass utf8È, xmlSnippetHeader:"<fmxmlsnippet type=\"FMObjectList\">", xmlSnippetFooter:"</fmxmlsnippet>"}
	set posixFolderPath to posixFolderPath of prefs
	set fileExtension to ".xml"
	set functionsXML to ""
	
	
	--read function XML files
	set fileNames to list folder (posixFolderPath) without invisibles
	repeat with functionIter from 1 to count of fileNames
		set oneFunctionFileName to item functionIter of fileNames
		set oneFunctionName to text 1 thru ((length of oneFunctionFileName) - (length of fileExtension)) of oneFunctionFileName
		set oneStandardFunctionFullXML to read POSIX file (posixFolderPath & oneFunctionFileName) as (fileEncoding of prefs)
		tell application "htcLib" to set oneStandardFunctionXML to getTextBetween({sourceTEXT:oneStandardFunctionFullXML, beforeText:(xmlSnippetHeader of prefs), afterText:(xmlSnippetFooter of prefs)})
		set functionsXML to functionsXML & oneStandardFunctionXML
	end repeat
	
	return xmlSnippetHeader of prefs & functionsXML & xmlSnippetFooter of prefs
end readStandardFunctionsAsXMLText




on coerceToString(incomingObject)
	-- version 2.2
	
	if class of incomingObject is string then
		set {text:incomingObject} to (incomingObject as string)
		return incomingObject
	else if class of incomingObject is integer then
		set {text:incomingObject} to (incomingObject as string)
		return incomingObject as string
	else if class of incomingObject is real then
		set {text:incomingObject} to (incomingObject as string)
		return incomingObject as string
	else if class of incomingObject is Unicode text then
		set {text:incomingObject} to (incomingObject as string)
		return incomingObject as string
	else
		-- LIST, RECORD, styled text, or unknown
		try
			try
				set some_UUID_Property_54F827C7379E4073B5A216BB9CDE575D of "XXXX" to "some_UUID_Value_54F827C7379E4073B5A216BB9CDE575D"
				
				-- GENERATE the error message for a known 'object' (here, a string) so we can get 
				-- the 'lead' and 'trail' part of the error message
			on error errMsg number errNum
				set {oldDelims, AppleScript's text item delimiters} to {AppleScript's text item delimiters, {"\"XXXX\""}}
				set {errMsgLead, errMsgTrail} to text items of errMsg
				set AppleScript's text item delimiters to oldDelims
			end try
			
			-- now, generate error message for the SPECIFIED object: 
			set some_UUID_Property_54F827C7379E4073B5A216BB9CDE575D of incomingObject to "some_UUID_Value_54F827C7379E4073B5A216BB9CDE575D"
			
			
		on error errMsg
			if errMsg starts with "System Events got an error: CanÕt make some_UUID_Property_54F827C7379E4073B5A216BB9CDE575D of " and errMsg ends with "into type specifier." then
				set errMsgLead to "System Events got an error: CanÕt make some_UUID_Property_54F827C7379E4073B5A216BB9CDE575D of "
				set errMsgTrail to " into type specifier."
				
				set {od, AppleScript's text item delimiters} to {AppleScript's text item delimiters, errMsgLead}
				
				set objectString to text item 2 of errMsg
				set AppleScript's text item delimiters to errMsgTrail
				
				set objectString to text item 1 of objectString
				set AppleScript's text item delimiters to od
				
				
				
			else
				--tell me to log errMsg
				set objectString to errMsg
				
				if objectString contains errMsgLead then
					set {od, AppleScript's text item delimiters} to {AppleScript's text item delimiters, errMsgLead}
					set objectString to text item 2 of objectString
					set AppleScript's text item delimiters to od
				end if
				
				if objectString contains errMsgTrail then
					set {od, AppleScript's text item delimiters} to {AppleScript's text item delimiters, errMsgTrail}
					set AppleScript's text item delimiters to errMsgTrail
					set objectString to text item 1 of objectString
					set AppleScript's text item delimiters to od
				end if
				
				--set {text:objectString} to (objectString as string) -- what does THIS do?
			end if
		end try
		
		return objectString
	end if
end coerceToString
