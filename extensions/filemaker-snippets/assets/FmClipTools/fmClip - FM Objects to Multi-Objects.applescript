-- FM-XML Objects to Multi-Objects
-- version 4.3, Daniel A. Shockley, Erik Shagdar
(* 
	Takes objects in the clipboard and adds multiple types of FileMaker objects into clipboard (plus return-delimited text). 
	

HISTORY:
	4.3 - 2023-05-24 ( danshockley ): Added getFmAppProc to avoid being tied to one specific "FileMaker" app name. 
	4.2 - 2023-02-07 ( danshockley ): Add support for custom functions (XMFN) by adding the function NAMES to the clipboard alongside the objects. 
	4.1 - 2019-09-11 ( danshockley ): If clipboard was Script Steps (XMSS) and not ALL were 'Set Field' or 'Set Variable', try to get useful info about all the different script steps, rather than ignoring. 
	4.0 - 2018-04-04 ( danshockley/eshagdar ): load fmObjectTranslator code by reference instead of embedded. Made fmObjTrans into a global so that sub-script objects can use the already-instantiated library object. 
	3.9.3 - 2017-08-09 ( eshagdar ): renamed 'FM-XML Objects to Multi-Objects' to 'fmClip - FM Objects to Multi-Objects' to match other handler name pattern
	3.9.2 - if the clipboard is text without double-colons then assume those aren't fields, but rather Variable names; Also, if the clipboard contains Set Variable script steps, extract the variable Name and Value into tab-separated columns. 
	3.9.1 - now works if the clipboard contains text (assumes those are fully-qualified field names).
	2.2 - extract field objects _wthin_ other layout objects
	2.1 - updated flattenList to avoid namespace conflict; 
	2.0 - modified to INCLUDE FM12 Layout Objects (as well as FM11, not instead of).
	1.8 - asking for table name actually ASKS for table name.
	1.7 - trims off extraneous line return at end of original text source, rather than silently failing. 
	1.6 - added error-trapping during the conversions to different FM objects. 
	1.5 - when original is BaseTables, look at the fields of each BaseTable and then process. BUT, do NOT try to create BaseTable objects from other sources. BaseTable is source-only, and just treated like a bunch of fields. 
	1.4 - when original is TEXT, preserve and add back that, rather than only plain. 
	1.3 - bug fix: if original format is clipboard, need to SET to others first, then add text last, or only the last 'set' FM object actually sticks. 
	1.2 - bug fix: when source is script steps, process ANY script step that has a FIELD, but flatten list.
	1.1 - fixed default NumFormat for field to "As Entered"
	1.0 - initial version, which generates LayoutObjects, FieldDefs, ScriptSteps(SetField), and plain text.

*)


property ScriptName : "FMXML Multi"

property debugMode : false

property fieldTableSep : "::"
property targetValueSep : ASCII character 9

global objTrans

on run
	
	(* Init Var *)
	set otherTextBlock to ""
	set otherTextItems to {}
	set fieldNames to {}
	set functionNames to {}
	set varNamesOptionalValues to {}
	set newClip to ""
	
	set objTrans to run script alias (((((path to me as text) & "::") as alias) as string) & "fmObjectTranslator.applescript")
	(* If you need a self-contained script, copy the code from fmObjectTranslator into this script and use the following instead of the run script step above:
			set objTrans to fmObjectTranslator_Instantiate({})
	*)
	
	
	if debugMode then my logConsole(ScriptName, "Starting.")
	
	try
		set someXML to clipboardGetObjectsAsXML({}) of objTrans
	on error errMsg number errNum
		set someXML to ""
	end try
	
	set originalClipboardFormat to currentCode of objTrans
	
	if debugMode then my logConsole(ScriptName, "original clip: " & originalClipboardFormat)
	
	if originalClipboardFormat is "" then
		-- PLAIN TEXT??  (assume it is)
		set fieldNames to get the clipboard
		set fieldNames to my trimWhitespace(fieldNames)
		set fieldNames to my parseChars({fieldNames, return})
		
		if class of fieldNames is not class of {1, 2} then set fieldNames to {fieldNames}
		
		set firstListItem to item 1 of fieldNames
		if firstListItem does not contain fieldTableSep then
			set varNamesOptionalValues to fieldNames
			set fieldNames to ""
		end if
		
		
		set originalClipboardFormat to "TEXT"
		
		-- END:		PLAIN TEXT. 
		
	else if originalClipboardFormat is "XML2" or originalClipboardFormat is "XMLO" then
		-- FM12 LAYOUT OBJECTS: 
		-- or FM11 LAYOUT OBJECTS: 
		
		tell application "System Events"
			set fieldDefXmlData to make new XML data with data someXML
			
			set foundFieldObjects to my getXMLElementsByName("FieldObj", XML element 1 of fieldDefXmlData)
			
			set fieldNames to {}
			repeat with oneFieldObject in foundFieldObjects
				set oneFieldName to (value of first XML element of oneFieldObject whose name is "Name")
				copy oneFieldName to end of fieldNames
			end repeat
		end tell
		
		-- result MIGHT BE nested lists, so flatten that list: 
		set fieldNames to flattenList(fieldNames)
		
		-- END:		FM11/12 LAYOUT OBJECTS. 		
		
		
	else if originalClipboardFormat is "XMFN" then
		-- CUSTOM FUNCTIONS: 
		
		tell application "System Events"
			set functionsXmlData to make new XML data with data someXML
			
			set functionNames to value of XML attribute "name" of (every XML element of XML element 1 of functionsXmlData whose name is "CustomFunction")
		end tell
		
	else if originalClipboardFormat is "XMFD" then
		-- FIELD DEFINITIONS: 
		
		tell application "System Events"
			set fieldDefXmlData to make new XML data with data someXML
			
			set fieldShortNames to value of XML attribute "name" of (every XML element of XML element 1 of fieldDefXmlData whose name is "Field")
		end tell
		-- result DOES NOT INCLUDE THE TABLE!
		tell application "System Events"
			set fmAppProc to my getFmAppProc()
			
			if name of window 1 of fmAppProc starts with "Manage Database for" then
				set tableName to value of pop up button 1 of tab group 1 of window 1 of fmAppProc
			else
				set tableName to text returned of (display dialog "Please enter the table name for these field objects." default answer "")
			end if
		end tell
		
		set fieldNames to tableName & "::" & my unParseChars(fieldShortNames, return & tableName & "::")
		set fieldNames to my parseChars({fieldNames, return})
		
		-- END:		FIELD DEFS. 
		
		
	else if originalClipboardFormat is "XMSS" then
		-- SCRIPT STEPS: 
		
		-- 2019-09-11 ( danshockley ): Changed logic so that it only extracts simple-text-list for 'Set Field' or 'Set Variable' if ALL of the copied script steps are for one of those. Otherwise, it tries to turn the script steps into a human-readable block of text.
		
		
		tell application "System Events"
			set scriptStepsXmlData to make new XML data with data someXML
			
			set countStepNodes to count of (every XML element of (XML element 1 of scriptStepsXmlData) whose name is "Step")
			
			set fieldShortNames to value of XML attribute "name" of (every XML element of (every XML element of XML element 1 of scriptStepsXmlData whose name is "Step") whose name is "Field")
			
			if (count of my flattenList(fieldShortNames)) is equal to countStepNodes then
				set fieldTableNames to value of XML attribute "table" of (every XML element of (every XML element of XML element 1 of scriptStepsXmlData whose name is "Step") whose name is "Field")
				
				set fieldShortNames to my flattenList(fieldShortNames)
				set fieldTableNames to my flattenList(fieldTableNames)
				
				
				set fieldNames to {}
				repeat with i from 1 to count of fieldShortNames
					
					set oneFieldShortName to item i of fieldShortNames
					set oneTableName to item i of fieldTableNames
					
					copy (oneTableName & "::" & oneFieldShortName) as string to end of fieldNames
					
				end repeat
				
				-- END OF: ALL are 'Set Field' steps. 
				
			else
				-- NOT ALL are 'Set Field' steps, so try 'Set Variable'
				set varNames to value of every XML element of (every XML element of (every XML element of (XML element 1 of scriptStepsXmlData) whose name is "Step") whose name is "Name")
				
				
				if (count of my flattenList(varNames)) is equal to countStepNodes then
					-- BEGIN: ALL are 'Set Variable' steps. 
					
					-- So, SIMPLY put their names and values into text for the clipboard. 
					set varValues to value of XML element "Calculation" of (every XML element of (every XML element of (every XML element of (XML element 1 of scriptStepsXmlData) whose name is "Step") whose name is "Value"))
					
					set varNames to my flattenList(varNames)
					set varValues to my flattenList(varValues)
					
					repeat with i from 1 to count of varNames
						set oneVarName to item i of varNames
						set oneVarValue to item i of varValues
						
						copy (oneVarName & targetValueSep & oneVarValue) as string to end of varNamesOptionalValues
					end repeat
					
					-- END OF: ALL are 'Set Variable' steps. 
					
				else
					-- BEGIN: script steps are NOT ALL "Set Field" or "Set Variable" steps, so convert what we can: 
					
					set stepNodes to every XML element of (XML element 1 of scriptStepsXmlData) whose name is "Step"
					
					repeat with oneStepNode in stepNodes
						set oneStepName to value of XML attribute "name" of oneStepNode
						if oneStepName is "# (comment)" then
							set oneStepName to "#"
							if exists XML element "Text" of oneStepNode then
								set stepSub_comment_Text to value of XML element "Text" of oneStepNode
							else
								set stepSub_comment_Text to ""
							end if
							set oneStepTEXT to oneStepName & space & stepSub_comment_Text
							
						else if oneStepName is "Commit Records/Requests" then
							if exists XML element "NoInteract" of oneStepNode then
								set stepSub_Commit_NoInteract to value of XML attribute "state" of XML element "NoInteract" of oneStepNode
							else
								set stepSub_Commit_NoInteract to ""
							end if
							
							if stepSub_Commit_NoInteract is "True" then
								set stepSub_Commit_WithDialog to "Off"
							else
								set stepSub_Commit_WithDialog to "On"
							end if
							
							set oneStepTEXT to oneStepName & space & " [ With dialog: " & stepSub_Commit_WithDialog & " ]"
							
						else if oneStepName is "Go to Layout" then
							if exists XML element "Layout" of oneStepNode then
								set stepSub_GoToLayout_LayoutName to value of XML attribute "name" of XML element "Layout" of oneStepNode
							else
								set stepSub_GoToLayout_LayoutName to ""
							end if
							set oneStepTEXT to oneStepName & space & " [ \"" & stepSub_GoToLayout_LayoutName & "\" ]"
							
						else if oneStepName is "If" or oneStepName is "Else If" then
							if exists XML element "Calculation" of oneStepNode then
								set stepSub_If_Calc to value of XML element "Calculation" of oneStepNode
							else
								set stepSub_If_Calc to ""
							end if
							set oneStepTEXT to oneStepName & space & " [ " & stepSub_If_Calc & " ]"
							
							
						else if oneStepName is "Perform Script" then
							if exists XML element "Script" of oneStepNode then
								set stepSub_PS_ScriptName to value of XML attribute "name" of XML element "Script" of oneStepNode
							else
								set stepSub_PS_ScriptName to ""
							end if
							if exists XML element "Calculation" of oneStepNode then
								set stepSub_PS_Param to value of XML element "Calculation" of oneStepNode
							else
								set stepSub_PS_Param to ""
							end if
							set oneStepTEXT to oneStepName & space & " [ Specified: From List ; \"" & stepSub_PS_ScriptName & "\" ; Parameter: " & stepSub_PS_Param & " ]"
							
						else if oneStepName is "Set Field" then
							if exists XML element "Field" of oneStepNode then
								set stepSub_SetField_Name to value of XML attribute "name" of XML element "Field" of oneStepNode
								set stepSub_SetField_Table to value of XML attribute "table" of XML element "Field" of oneStepNode
							else
								set stepSub_SetField_Name to ""
								set stepSub_SetField_Table to ""
							end if
							if exists XML element "Calculation" of oneStepNode then
								set stepSub_SetField_Calc to value of XML element "Calculation" of oneStepNode
							else
								set stepSub_SetField_Calc to ""
							end if
							set oneStepTEXT to oneStepName & space & " [ " & stepSub_SetField_Table & "::" & stepSub_SetField_Name & " ; " & stepSub_SetField_Calc & " ]"
							
						else
							-- some not-really-supported script step, so just get the step name:
							set oneStepTEXT to oneStepName
						end if
						
						
						copy oneStepTEXT to end of otherTextItems
					end repeat
					
					set otherTextBlock to my flattenList(otherTextItems)
					set otherTextBlock to my unParseChars(otherTextBlock, return)
					
					-- END OF: script steps are NOT ALL "Set Field" or "Set Variable" steps, so convert what we can: 
				end if
				
			end if
			
			
		end tell
		
		-- END:		SCRIPT STEPS. 
		
	else if originalClipboardFormat is "XMTB" then
		-- TABLES (so get their fields): 
		
		tell application "System Events"
			set fieldDefXmlData to make new XML data with data someXML
			
			set baseTableNames to value of XML attribute "name" of (every XML element of XML element 1 of fieldDefXmlData whose name is "BaseTable")
			
			if debugMode then my logConsole(ScriptName, "Tables: " & my unParseChars(baseTableNames, ", "))
			
			set fieldNames to {}
			
			repeat with oneBaseTable in baseTableNames
				set oneBaseTable to contents of oneBaseTable
				
				set oneTableFieldShortNames to value of XML attribute "name" of (every XML element of (first XML element of XML element 1 of fieldDefXmlData whose value of XML attribute "name" is oneBaseTable) whose name is "Field")
				
				set oneTableFieldRefs to oneBaseTable & "::" & my unParseChars(oneTableFieldShortNames, return & oneBaseTable & "::")
				set oneTableFieldRefs to my parseChars({oneTableFieldRefs, return})
				
				repeat with oneFieldRef in oneTableFieldRefs
					set oneFieldRef to contents of oneFieldRef
					copy oneFieldRef to end of fieldNames
				end repeat
			end repeat
		end tell
		-- END:		TABLES. 
		
	end if
	
	
	
	
	
	
	if originalClipboardFormat is "TEXT" then
		set textClipboard to my preserveClipboard()
	end if
	
	
	if originalClipboardFormat is not "XMLO" or originalClipboardFormat is "TEXT" then
		
		if (count of fieldNames) is not 0 then
			
			set layoutObjectsFm11_XML to addFieldsAsLayoutObjectsFM11(fieldNames)
			
			if originalClipboardFormat is "TEXT" then
				-- NOTE: if original is TEXT, need to wipe out original clipboard by setting to FM Objects FIRST, then add TEXT at end of script:
				
				set currentCode of objTrans to "XMLO"
				
				set newObjects to convertXmlToObjects(layoutObjectsFm11_XML) of objTrans
				
				set newClip to {Çclass XMLOÈ:newObjects}
				
				set the clipboard to newClip
				
			end if
		end if
		
	end if
	
	
	if originalClipboardFormat is not "XML2" then
		
		if (count of fieldNames) is not 0 then
			set layoutObjectsFm12_XML to addFieldsAsLayoutObjectsFM12(fieldNames)
		end if
		
	end if
	
	
	
	
	if originalClipboardFormat is not "XMSS" then
		
		if (count of fieldNames) is not 0 then
			-- they DID have table::field notation, so make Set Field steps:
			set scriptStepsXML to addFieldsAsScriptSteps(fieldNames)
			
		else if (count of varNamesOptionalValues) is not 0 then
			-- try using as variable names instead:
			-- 3.9.2 - check whether we should use the source text as variables (with optional values) instead of hoping they are field references 	
			
			set scriptStepsXML to addTextToVariableScriptSteps(varNamesOptionalValues)
			
			get the clipboard as Çclass XMSSÈ
			return result
			
		end if
		
	end if
	
	
	if originalClipboardFormat is not "XMFD" and originalClipboardFormat is not "XMTB" then
		-- treat Table like Fields (so don't add fields if it was either). 
		
		if (count of fieldNames) is not 0 then
			set fieldDefsXML to addFieldsAsFieldDefs(fieldNames)
		end if
		
	end if
	
	
	-- NOW, add them in as text, too, even if already there: 
	set fmClipboard to get the clipboard
	
	if originalClipboardFormat is "TEXT" then
		-- RESTORE what was saved above: 
		set newClip to textClipboard & fmClipboard
		
	else if length of otherTextBlock is greater than 0 then
		-- do this INSTEAD of trying to handle a list of field or variable names:
		set newClip to {string:otherTextBlock} & fmClipboard
		
	else if (count of fieldNames) is not 0 then
		set fieldNamesListAsText to unParseChars(fieldNames, return)
		set newClip to {string:fieldNamesListAsText} & fmClipboard
		
	else if (count of varNamesOptionalValues) is not 0 then
		set varNamesValuesListAsText to unParseChars(varNamesOptionalValues, return)
		set newClip to {string:varNamesValuesListAsText} & fmClipboard
		
	else if (count of functionNames) is not 0 then
		set functionNamesListAsText to unParseChars(functionNames, return)
		set newClip to {string:functionNamesListAsText} & fmClipboard
		
	end if
	
	if length of newClip is greater than 0 then
		set the clipboard to newClip
	end if
	
	
	
	return otherTextBlock
	
	
	return originalClipboardFormat
	
	
	
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


on addTextToVariableScriptSteps(nameOptionalValueList)
	
	script textToVariableScriptSteps
		
		property headerScriptStepsXML : "<fmxmlsnippet type=\"FMObjectList\">"
		property footerScriptStepsXML : "</fmxmlsnippet>"
		property stepStartXML : "<Step enable=\"True\" id=\"141\" name=\"Set Variable\">"
		property varValuePrefixXML : "<Value>"
		property valueCalcPrefixXML : "<Calculation><![CDATA["
		property valueCalcSuffixXML : "]]></Calculation>"
		property varValueSuffixXML : "</Value>"
		property repPrefixXML : "<Repetition><Calculation><![CDATA["
		property repSuffixXML : "]]></Calculation></Repetition>"
		property varNamePrefixXML : "<Name>"
		property varNameSuffixXML : "</Name>"
		property stepEndXML : "</Step>"
		
		on run
			--set objTrans to fmObjectTranslator_Instantiate({})
			
			set colSep to ASCII character 9
			
			if item 1 of nameOptionalValueList contains colSep then
				set hasVarValue to true
			else
				set hasVarValue to false
			end if
			
			set buildingXML to headerScriptStepsXML
			
			
			repeat with oneStep in nameOptionalValueList
				set oneStepRAW to contents of oneStep
				
				if hasVarValue then
					set {varName, varValue} to parseChars({oneStepRAW, colSep})
				else
					set varName to oneStepRAW
					set varValue to "\"\""
				end if
				
				if varName contains "[" and varName contains "]" then
					set repNum to getTextBetweenMultiple(varName, "[", "]")
					set varName to item 1 of parseChars({varName, "["})
				else
					set repNum to 1
				end if
				
				if varName does not start with "$" then set varName to "$" & varName
				
				
				
				if length of varName is greater than 0 then
					
					set oneScriptStep to ""
					set oneScriptStep to oneScriptStep & stepStartXML
					set oneScriptStep to oneScriptStep & varValuePrefixXML
					set oneScriptStep to oneScriptStep & valueCalcPrefixXML
					set oneScriptStep to oneScriptStep & varValue
					set oneScriptStep to oneScriptStep & valueCalcSuffixXML
					set oneScriptStep to oneScriptStep & varValueSuffixXML
					set oneScriptStep to oneScriptStep & repPrefixXML
					set oneScriptStep to oneScriptStep & repNum
					set oneScriptStep to oneScriptStep & repSuffixXML
					set oneScriptStep to oneScriptStep & varNamePrefixXML
					set oneScriptStep to oneScriptStep & varName
					set oneScriptStep to oneScriptStep & varNameSuffixXML
					set oneScriptStep to oneScriptStep & stepEndXML
					
					set buildingXML to buildingXML & return & oneScriptStep
				end if
				
			end repeat
			
			
			set buildingXML to buildingXML & return & footerScriptStepsXML
			
			set currentCode of objTrans to "XMSS"
			
			set scriptStepsObjects to convertXmlToObjects(buildingXML) of objTrans
			
			
			set fmClipboard to get the clipboard
			
			set newClip to {Çclass XMSSÈ:scriptStepsObjects} & fmClipboard
			
			set the clipboard to newClip
			
			return buildingXML
			
			
			
		end run
		
	end script
	
	
	run textToVariableScriptSteps
	
end addTextToVariableScriptSteps









on addFieldsAsLayoutObjectsFM12(fieldNameList)
	
	script fieldsToLayoutObjects
		
		property pixelLayoutTop : 10
		property pixelsVerticalBetweenFields : 22
		property pixelLabelTopStart : pixelLayoutTop + 3
		property pixelLabelHeight : 16
		property pixelFieldTopStart : 10
		property pixelFieldHeight : 20
		
		property headerXML : "<?xml version=\"1.0\" encoding=\"utf-8\"?>" & return & "<fmxmlsnippet type=\"LayoutObjectList\">"
		property footerXML : "</fmxmlsnippet>"
		property templateLayoutOpenXML : "<Layout enclosingRectTop =\"###LAYOUT_TOP###\" enclosingRectLeft =\" 3.000000\" enclosingRectBottom =\"###LAYOUT_BOTTOM###\" enclosingRectRight =\"367.000000\">"
		
		property layoutFooterXML : "</Layout>"
		
		
		(*  ##################################################################### *)
		(*  ##################################################################### *)
		
		
		property templateLabelXML : "<Object type=\"Text\" key=\"###OBJECT_KEY###\" LabelKey=\"0\" flags=\"0\" rotation=\"0\">
<Bounds top=\"###LABEL_TOP###\" left=\" 3.000000\" bottom=\"###LABEL_BOTTOM###\" right=\"203.000000\"/>
<TextObj flags=\"0\">
<ExtendedAttributes fontHeight=\"12\" graphicFormat=\"0\">
<NumFormat flags=\"0\" charStyle=\"0\" negativeStyle=\"0\" currencySymbol=\"\" thousandsSep=\"0\" decimalPoint=\"0\" negativeColor=\"#0\" decimalDigits=\"0\" trueString=\"\" falseString=\"\"/>
<DateFormat format=\"0\" charStyle=\"0\" monthStyle=\"0\" dayStyle=\"0\" separator=\"0\">
<DateElement>0</DateElement>
<DateElement>0</DateElement>
<DateElement>0</DateElement>
<DateElement>0</DateElement>
<DateElementSep index=\"0\"></DateElementSep>
<DateElementSep index=\"1\"></DateElementSep>
<DateElementSep index=\"2\"></DateElementSep>
<DateElementSep index=\"3\"></DateElementSep>
<DateElementSep index=\"4\"></DateElementSep>
</DateFormat>
<TimeFormat flags=\"0\" charStyle=\"0\" hourStyle=\"0\" minsecStyle=\"0\" separator=\"0\" amString=\"\" pmString=\"\" ampmString=\"\"/>
</ExtendedAttributes>
<Styles>
<LocalCSS>
self&#10;{&#10;&#09;font-family: -fm-font-family(arial,sans-serif,roman);&#10;&#09;font-weight: normal;&#10;&#09;font-stretch: normal;&#10;&#09;font-style: normal;&#10;&#09;font-variant: normal;&#10;&#09;font-size: 11pt;&#10;&#09;color: rgba(40.3922%,40.3922%,40.3922%,1);&#10;&#09;line-height: 1line;&#10;&#09;text-align: right;&#10;&#09;text-transform: none;&#10;&#09;-fm-strikethrough: false;&#10;&#09;-fm-underline: none;&#10;&#09;-fm-glyph-variant: ;&#10;&#09;-fm-highlight-color: rgba(0%,0%,0%,0);&#10;}&#10;</LocalCSS>
</Styles>
<CharacterStyleVector>
<Style>
<Data>###LABEL_TEXT###</Data>
<CharacterStyle mask=\"32695\">
<Font-family codeSet=\"Roman\" fontId=\"21\">arial,sans-serif</Font-family>
<Font-size>11</Font-size>
<Face>0</Face>
<Color>#676767</Color>
</CharacterStyle>
</Style>
</CharacterStyleVector>
<ParagraphStyleVector>
<Style>
<Data>###LABEL_TEXT###</Data>
<ParagraphStyle mask=\"0\">
</ParagraphStyle>
</Style>
</ParagraphStyleVector>
</TextObj>
</Object>" & return
		
		property templateFieldXML : "<Object type=\"Field\" key=\"###OBJECT_KEY###\" LabelKey=\"###LABEL_KEY###\" flags=\"0\" rotation=\"0\">
<Bounds top=\"###FIELD_TOP###\" left=\"207.000000\" bottom=\"###FIELD_BOTTOM###\" right=\"367.000000\"/>
<FieldObj numOfReps=\"1\" flags=\"32\" inputMode=\"0\" displayType=\"0\" quickFind=\"1\" pictFormat=\"5\">
<Name>###TOCNAME###::###FIELDNAMESHORT###</Name>
<ExtendedAttributes fontHeight=\"12\" graphicFormat=\"5\">
<NumFormat flags=\"2304\" charStyle=\"0\" negativeStyle=\"0\" currencySymbol=\"$\" thousandsSep=\"44\" decimalPoint=\"46\" negativeColor=\"#DD000000\" decimalDigits=\"2\" trueString=\"Yes\" falseString=\"No\"/>
<DateFormat format=\"0\" charStyle=\"0\" monthStyle=\"0\" dayStyle=\"0\" separator=\"47\">
<DateElement>3</DateElement>
<DateElement>6</DateElement>
<DateElement>1</DateElement>
<DateElement>8</DateElement>
<DateElementSep index=\"0\"></DateElementSep>
<DateElementSep index=\"1\">, </DateElementSep>
<DateElementSep index=\"2\"> </DateElementSep>
<DateElementSep index=\"3\">, </DateElementSep>
<DateElementSep index=\"4\"></DateElementSep>
</DateFormat>
<TimeFormat flags=\"143\" charStyle=\"0\" hourStyle=\"0\" minsecStyle=\"1\" separator=\"58\" amString=\" AM\" pmString=\" PM\" ampmString=\"\"/>
</ExtendedAttributes>
<DDRInfo>
<Field name=\"###FIELDNAMESHORT###\" id=\"1\" repetition=\"1\" maxRepetition=\"1\" table=\"###TOCNAME###\"/>
</DDRInfo>
</FieldObj>
</Object>
"
		
		
		on fmPrecisionCoordString(someNumber)
			
			set integerPart to someNumber div 1
			
			set decimalPart to someNumber - integerPart
			
			set decimalPartAsString to (decimalPart as string)
			if decimalPartAsString contains "." then
				set decimalPartAsString to text 3 thru -1 of decimalPartAsString
			end if
			
			set decimalPartAsString to text 1 thru 6 of (decimalPartAsString & "000000")
			
			return (integerPart as string) & "." & decimalPartAsString
			
		end fmPrecisionCoordString
		
		
		
		
		
		on run
			--set objTrans to fmObjectTranslator_Instantiate({})
			
			
			
			set buildingXML to headerXML
			
			(*
		property pixelLayoutTop : 10
		property pixelsVerticalBetweenFields : 24
		property pixelLabelTopStart : pixelLayoutTop + 2
		property pixelLabelHeight : 13
		property pixelFieldTopStart : pixelLayoutTop
		property pixelFieldHeight : 16
*)
			
			
			-- Need to build FIELD (and label) OBJECTs XML first, so we know the total bounding dimensions (bottom)
			set objectKey to 0
			set objectsXML to ""
			repeat with i from 1 to count of fieldNameList
				set oneFieldName to item i of fieldNameList
				set oneFieldName to oneFieldName as string
				
				if length of oneFieldName is greater than 0 then
					
					set pixelLabelTop to pixelLabelTopStart + (i - 1) * pixelsVerticalBetweenFields
					set pixelLabelBottom to pixelLabelTop + pixelLabelHeight
					
					set pixelFieldTop to pixelFieldTopStart + (i - 1) * pixelsVerticalBetweenFields
					set pixelFieldBottom to pixelFieldTop + pixelFieldHeight
					
					set {tocName, fieldNameShort} to parseChars({oneFieldName, "::"})
					
					
					set objectKey to objectKey + 1 -- increment the objectKey for this next object
					
					
					set oneLabelXML to templateLabelXML
					set oneLabelXML to my replaceSimple({oneLabelXML, "###OBJECT_KEY###", objectKey})
					set oneLabelXML to my replaceSimple({oneLabelXML, "###LABEL_TOP###", fmPrecisionCoordString(pixelLabelTop)})
					set oneLabelXML to my replaceSimple({oneLabelXML, "###LABEL_BOTTOM###", fmPrecisionCoordString(pixelLabelBottom)})
					set oneLabelXML to my replaceSimple({oneLabelXML, "###LABEL_TEXT###", fieldNameShort})
					
					
					set labelKey to objectKey
					set objectKey to objectKey + 1 -- increment the objectKey for this next object
					
					set oneFieldXML to templateFieldXML
					set oneLabelXML to my replaceSimple({oneLabelXML, "###OBJECT_KEY###", objectKey})
					set oneLabelXML to my replaceSimple({oneLabelXML, "###LABEL_KEY###", labelKey})
					set oneFieldXML to my replaceSimple({oneFieldXML, "###FIELD_TOP###", fmPrecisionCoordString(pixelFieldTop)})
					set oneFieldXML to my replaceSimple({oneFieldXML, "###FIELD_BOTTOM###", fmPrecisionCoordString(pixelFieldBottom)})
					set oneFieldXML to my replaceSimple({oneFieldXML, "###FIELDNAMESHORT###", fieldNameShort})
					set oneFieldXML to my replaceSimple({oneFieldXML, "###TOCNAME###", tocName})
					
					
					set objectsXML to objectsXML & return & oneLabelXML & return & oneFieldXML
				end if
				
			end repeat
			
			set pixelLayoutBottom to pixelFieldBottom -- bottom of final field is bottom of LAYOUT bounds
			
			
			set layoutHeaderXML to templateLayoutOpenXML
			set layoutHeaderXML to my replaceSimple({layoutHeaderXML, "###LAYOUT_TOP###", fmPrecisionCoordString(pixelLayoutTop)})
			set layoutHeaderXML to my replaceSimple({layoutHeaderXML, "###LAYOUT_BOTTOM###", fmPrecisionCoordString(pixelLayoutBottom)})
			
			
			set buildingXML to buildingXML & return & layoutHeaderXML
			
			
			set buildingXML to buildingXML & return & objectsXML
			
			
			set buildingXML to buildingXML & return & layoutFooterXML
			
			set buildingXML to buildingXML & return & footerXML
			
			
			-- DONE BUILDING XML: 
			
			set currentCode of objTrans to "XML2"
			
			set newObjects to convertXmlToObjects(buildingXML) of objTrans
			
			
			set fmClipboard to get the clipboard
			
			set newClip to {Çclass XML2È:newObjects} & fmClipboard
			
			set the clipboard to newClip
			
			return buildingXML
			
			
			
		end run
		
		
		
		
		
		on replaceSimple(prefs)
			-- version 1.4, Daniel A. Shockley http://www.danshockley.com
			
			-- 1.4 - Convert sourceText to string, since the previous version failed on numbers. 
			-- 1.3 - The class record is specified into a variable to avoid a namespace conflict when run within FileMaker. 
			-- 1.2 - changes parameters to a record to add option to CONSIDER CASE, since the default changed to ignoring case with Snow Leopard. This handler defaults to CONSIDER CASE = true, since that was what older code expected. 
			-- 1.1 - coerces the newChars to a STRING, since other data types do not always coerce
			--     (example, replacing "nine" with 9 as number replaces with "")
			
			set defaultPrefs to {considerCase:true}
			
			if class of prefs is list then
				if (count of prefs) is greater than 3 then
					-- get any parameters after the initial 3
					set prefs to {sourceText:item 1 of prefs, oldChars:item 2 of prefs, newChars:item 3 of prefs, considerCase:item 4 of prefs}
				else
					set prefs to {sourceText:item 1 of prefs, oldChars:item 2 of prefs, newChars:item 3 of prefs}
				end if
				
			else if class of prefs is not equal to (class of {someKey:3}) then
				-- Test by matching class to something that IS a record to avoid FileMaker namespace conflict with the term "record"
				
				error "The parameter for 'replaceSimple()' should be a record or at least a list. Wrap the parameter(s) in curly brackets for easy upgrade to 'replaceSimple() version 1.3. " number 1024
				
			end if
			
			set prefs to prefs & defaultPrefs
			
			set considerCase to considerCase of prefs
			set sourceText to sourceText of prefs
			set oldChars to oldChars of prefs
			set newChars to newChars of prefs
			
			set sourceText to sourceText as string
			
			set oldDelims to AppleScript's text item delimiters
			set AppleScript's text item delimiters to the oldChars
			if considerCase then
				considering case
					set the parsedList to every text item of sourceText
					set AppleScript's text item delimiters to the {(newChars as string)}
					set the newText to the parsedList as string
				end considering
			else
				ignoring case
					set the parsedList to every text item of sourceText
					set AppleScript's text item delimiters to the {(newChars as string)}
					set the newText to the parsedList as string
				end ignoring
			end if
			set AppleScript's text item delimiters to oldDelims
			return newText
			
		end replaceSimple
		
		
	end script
	
	
	run fieldsToLayoutObjects
	
end addFieldsAsLayoutObjectsFM12











on addFieldsAsLayoutObjectsFM11(fieldNameList)
	
	script fieldsToLayoutObjects
		
		property pixelLayoutTop : 10
		property pixelsVerticalBetweenFields : 18
		property pixelLabelTopStart : pixelLayoutTop + 2
		property pixelLabelHeight : 13
		property pixelFieldTopStart : 10
		property pixelFieldHeight : 16
		
		property headerXML : "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" & return & "<fmxmlsnippet type=\"LayoutObjectList\">"
		property footerXML : "</fmxmlsnippet>"
		property templateLayoutOpenXML : "<Layout enclosingRectTop =\"###LAYOUT_TOP###\" enclosingRectLeft =\" 3.000000\" enclosingRectBottom =\"###LAYOUT_BOTTOM###\" enclosingRectRight =\"367.000000\">"
		
		property layoutFooterXML : "</Layout>"
		
		property layoutObjectStylesXML : return & Â
			"<ObjectStyle id=\"0\" fontHeight=\"11\" graphicFormat=\"5\" fieldBorders=\"15\">
<CharacterStyle mask=\"32695\">
<Font-family codeSet=\"Roman\" fontId=\"13\">Arial</Font-family>
<Font-size>10</Font-size>
<Face>256</Face>
<Color>#000000</Color>
</CharacterStyle>
<ParagraphStyle mask=\"1983\">
<Justification>3</Justification>
</ParagraphStyle>
<NumFormat flags=\"13\" charStyle=\"0\" negativeStyle=\"0\" currencySymbol=\"#\" thousandsSep=\"44\" decimalPoint=\"46\" negativeColor=\"#DD000000\" decimalDigits=\"0\" trueString=\"Yes\" falseString=\"No\"/>
<DateFormat format=\"0\" charStyle=\"0\" monthStyle=\"0\" dayStyle=\"0\" separator=\"47\">
<DateElement>3</DateElement>
<DateElement>6</DateElement>
<DateElement>1</DateElement>
<DateElement>8</DateElement>
<DateElementSep index=\"0\"></DateElementSep>
<DateElementSep index=\"1\">, </DateElementSep>
<DateElementSep index=\"2\"> </DateElementSep>
<DateElementSep index=\"3\">, </DateElementSep>
<DateElementSep index=\"4\"></DateElementSep>
</DateFormat>
<TimeFormat flags=\"143\" charStyle=\"0\" hourStyle=\"0\" minsecStyle=\"1\" separator=\"58\" amString=\" AM\" pmString=\" PM\" ampmString=\"\"/>
<DrawStyle linePat=\"2\" lineWidth=\"1\" lineColor=\"#0\" fillPat=\"1\" fillEffect=\"0\" fillColor=\"#FFFFFF00\"/>
<AltLineStyle linePat=\"7\" lineWidth=\"1\" lineColor=\"#0\"/>
</ObjectStyle>" & return & return & "<ObjectStyle id=\"1\" fontHeight=\"14\" graphicFormat=\"5\" fieldBorders=\"15\">
<CharacterStyle mask=\"32695\">
<Font-family codeSet=\"Roman\" fontId=\"13\">Arial</Font-family>
<Font-size>12</Font-size>
<Face>0</Face>
<Color>#000000</Color>
</CharacterStyle>
<ParagraphStyle mask=\"1983\">
<LeftMargin>  1.000000</LeftMargin>
<RightMargin>  1.000000</RightMargin>
</ParagraphStyle>
<NumFormat flags=\"13\" charStyle=\"0\" negativeStyle=\"0\" currencySymbol=\"#\" thousandsSep=\"44\" decimalPoint=\"46\" negativeColor=\"#DD000000\" decimalDigits=\"0\" trueString=\"Yes\" falseString=\"No\"/>
<DateFormat format=\"0\" charStyle=\"0\" monthStyle=\"0\" dayStyle=\"0\" separator=\"47\">
<DateElement>3</DateElement>
<DateElement>6</DateElement>
<DateElement>1</DateElement>
<DateElement>8</DateElement>
<DateElementSep index=\"0\"></DateElementSep>
<DateElementSep index=\"1\">, </DateElementSep>
<DateElementSep index=\"2\"> </DateElementSep>
<DateElementSep index=\"3\">, </DateElementSep>
<DateElementSep index=\"4\"></DateElementSep>
</DateFormat>
<TimeFormat flags=\"143\" charStyle=\"0\" hourStyle=\"0\" minsecStyle=\"1\" separator=\"58\" amString=\" AM\" pmString=\" PM\" ampmString=\"\"/>
<DrawStyle linePat=\"2\" lineWidth=\"1\" lineColor=\"#0\" fillPat=\"1\" fillEffect=\"0\" fillColor=\"#FFFFFF00\"/>
<AltLineStyle linePat=\"7\" lineWidth=\"1\" lineColor=\"#0\"/>
</ObjectStyle>" & return
		
		
		property templateLabelXML : "<Object type=\"Text\" flags=\"0\" portal=\"-1\" rotation=\"0\">
<StyleId>0</StyleId>
<Bounds top=\"###LABEL_TOP###\" left=\" 3.000000\" bottom=\"###LABEL_BOTTOM###\" right=\"203.000000\"/>
<DrawStyle linePat=\"1\" lineWidth=\"0\" lineColor=\"#FFFFFF00\" fillPat=\"1\" fillEffect=\"0\" fillColor=\"#FFFFFF00\"/>
<TextObj flags=\"0\">
<CharacterStyleVector>
<Style>
<Data>###LABEL_TEXT###</Data>
<CharacterStyle mask=\"32695\">
<Font-family codeSet=\"Roman\" fontId=\"13\">Arial</Font-family>
<Font-size>10</Font-size>
<Face>256</Face>
<Color>#000000</Color>
</CharacterStyle>
</Style>
</CharacterStyleVector>
<ParagraphStyleVector>
<Style>
<Data>###LABEL_TEXT###</Data>
<ParagraphStyle mask=\"0\">
</ParagraphStyle>
</Style>
</ParagraphStyleVector>
</TextObj>
</Object>" & return
		
		property templateFieldXML : "<Object type=\"Field\" flags=\"0\" portal=\"-1\" rotation=\"0\">
<StyleId>1</StyleId>
<Bounds top=\"###FIELD_TOP###\" left=\"207.000000\" bottom=\"###FIELD_BOTTOM###\" right=\"367.000000\"/>
<FieldObj numOfReps=\"1\" flags=\"32\" inputMode=\"0\" displayType=\"0\" quickFind=\"1\">
<Name>###TOCNAME###::###FIELDNAMESHORT###</Name>
<DDRInfo>
<Field name=\"###FIELDNAMESHORT###\" id=\"25\" repetition=\"1\" maxRepetition=\"1\" table=\"###TOCNAME###\"/>
</DDRInfo>
</FieldObj>
</Object>
"
		
		
		on fmPrecisionCoordString(someNumber)
			
			set integerPart to someNumber div 1
			
			set decimalPart to someNumber - integerPart
			
			set decimalPartAsString to (decimalPart as string)
			if decimalPartAsString contains "." then
				set decimalPartAsString to text 3 thru -1 of decimalPartAsString
			end if
			
			set decimalPartAsString to text 1 thru 6 of (decimalPartAsString & "000000")
			
			return (integerPart as string) & "." & decimalPartAsString
			
		end fmPrecisionCoordString
		
		
		
		
		
		on run
			--set objTrans to fmObjectTranslator_Instantiate({})
			
			
			
			set buildingXML to headerXML
			
			(*
		property pixelLayoutTop : 10
		property pixelsVerticalBetweenFields : 24
		property pixelLabelTopStart : pixelLayoutTop + 2
		property pixelLabelHeight : 13
		property pixelFieldTopStart : pixelLayoutTop
		property pixelFieldHeight : 16
*)
			
			
			logConsole(ScriptName, count of fieldNameList)
			
			-- Need to build FIELD (and label) OBJECTs XML first, so we know the total bounding dimensions (bottom)
			set objectsXML to ""
			repeat with i from 1 to count of fieldNameList
				set oneFieldName to item i of fieldNameList
				set oneFieldName to oneFieldName as string
				
				if length of oneFieldName is greater than 0 then
					
					set pixelLabelTop to pixelLabelTopStart + (i - 1) * pixelsVerticalBetweenFields
					set pixelLabelBottom to pixelLabelTop + pixelLabelHeight
					
					set pixelFieldTop to pixelFieldTopStart + (i - 1) * pixelsVerticalBetweenFields
					set pixelFieldBottom to pixelFieldTop + pixelFieldHeight
					
					
					set {tocName, fieldNameShort} to parseChars({oneFieldName, "::"})
					
					
					set oneLabelXML to templateLabelXML
					set oneLabelXML to my replaceSimple({oneLabelXML, "###LABEL_TOP###", fmPrecisionCoordString(pixelLabelTop)})
					set oneLabelXML to my replaceSimple({oneLabelXML, "###LABEL_BOTTOM###", fmPrecisionCoordString(pixelLabelBottom)})
					set oneLabelXML to my replaceSimple({oneLabelXML, "###LABEL_TEXT###", fieldNameShort})
					
					set oneFieldXML to templateFieldXML
					set oneFieldXML to my replaceSimple({oneFieldXML, "###FIELD_TOP###", fmPrecisionCoordString(pixelFieldTop)})
					set oneFieldXML to my replaceSimple({oneFieldXML, "###FIELD_BOTTOM###", fmPrecisionCoordString(pixelFieldBottom)})
					set oneFieldXML to my replaceSimple({oneFieldXML, "###FIELDNAMESHORT###", fieldNameShort})
					set oneFieldXML to my replaceSimple({oneFieldXML, "###TOCNAME###", tocName})
					
					
					set objectsXML to objectsXML & return & oneLabelXML & return & oneFieldXML
				end if
				
			end repeat
			
			set pixelLayoutBottom to pixelFieldBottom -- bottom of final field is bottom of LAYOUT bounds
			
			
			set layoutHeaderXML to templateLayoutOpenXML
			set layoutHeaderXML to my replaceSimple({layoutHeaderXML, "###LAYOUT_TOP###", fmPrecisionCoordString(pixelLayoutTop)})
			set layoutHeaderXML to my replaceSimple({layoutHeaderXML, "###LAYOUT_BOTTOM###", fmPrecisionCoordString(pixelLayoutBottom)})
			
			
			set buildingXML to buildingXML & return & layoutHeaderXML
			
			set buildingXML to buildingXML & return & layoutObjectStylesXML
			
			set buildingXML to buildingXML & return & objectsXML
			
			set buildingXML to buildingXML & return & layoutFooterXML
			
			set buildingXML to buildingXML & return & footerXML
			
			
			-- DONE BUILDING XML: 
			
			set currentCode of objTrans to "XMLO"
			
			set newObjects to convertXmlToObjects(buildingXML) of objTrans
			
			
			set fmClipboard to get the clipboard
			
			set newClip to {Çclass XMLOÈ:newObjects} & fmClipboard
			
			set the clipboard to newClip
			
			return buildingXML
			
			
			
		end run
		
		
		
		
		
		on replaceSimple(prefs)
			-- version 1.4, Daniel A. Shockley http://www.danshockley.com
			
			-- 1.4 - Convert sourceText to string, since the previous version failed on numbers. 
			-- 1.3 - The class record is specified into a variable to avoid a namespace conflict when run within FileMaker. 
			-- 1.2 - changes parameters to a record to add option to CONSIDER CASE, since the default changed to ignoring case with Snow Leopard. This handler defaults to CONSIDER CASE = true, since that was what older code expected. 
			-- 1.1 - coerces the newChars to a STRING, since other data types do not always coerce
			--     (example, replacing "nine" with 9 as number replaces with "")
			
			set defaultPrefs to {considerCase:true}
			
			if class of prefs is list then
				if (count of prefs) is greater than 3 then
					-- get any parameters after the initial 3
					set prefs to {sourceText:item 1 of prefs, oldChars:item 2 of prefs, newChars:item 3 of prefs, considerCase:item 4 of prefs}
				else
					set prefs to {sourceText:item 1 of prefs, oldChars:item 2 of prefs, newChars:item 3 of prefs}
				end if
				
			else if class of prefs is not equal to (class of {someKey:3}) then
				-- Test by matching class to something that IS a record to avoid FileMaker namespace conflict with the term "record"
				
				error "The parameter for 'replaceSimple()' should be a record or at least a list. Wrap the parameter(s) in curly brackets for easy upgrade to 'replaceSimple() version 1.3. " number 1024
				
			end if
			
			set prefs to prefs & defaultPrefs
			
			set considerCase to considerCase of prefs
			set sourceText to sourceText of prefs
			set oldChars to oldChars of prefs
			set newChars to newChars of prefs
			
			set sourceText to sourceText as string
			
			set oldDelims to AppleScript's text item delimiters
			set AppleScript's text item delimiters to the oldChars
			if considerCase then
				considering case
					set the parsedList to every text item of sourceText
					set AppleScript's text item delimiters to the {(newChars as string)}
					set the newText to the parsedList as string
				end considering
			else
				ignoring case
					set the parsedList to every text item of sourceText
					set AppleScript's text item delimiters to the {(newChars as string)}
					set the newText to the parsedList as string
				end ignoring
			end if
			set AppleScript's text item delimiters to oldDelims
			return newText
			
		end replaceSimple
		
		
	end script
	
	
	run fieldsToLayoutObjects
	
end addFieldsAsLayoutObjectsFM11



















on addFieldsAsFieldDefs(fieldNameList)
	
	script fieldsToFieldDefs
		
		property headerXML : "<fmxmlsnippet type=\"FMObjectList\">"
		property footerXML : "</fmxmlsnippet>"
		property templateFieldDefStartXML : "<Field id=\"1\" dataType=\"Text\" fieldType=\"Normal\" name=\""
		
		property templateFieldDefEndXML : "\"><Comment></Comment><AutoEnter allowEditing=\"True\" constant=\"False\" furigana=\"False\" lookup=\"False\" calculation=\"False\"><ConstantData></ConstantData></AutoEnter><Validation message=\"False\" maxLength=\"False\" valuelist=\"False\" calculation=\"False\" alwaysValidateCalculation=\"False\" type=\"OnlyDuringDataEntry\"><NotEmpty value=\"False\"></NotEmpty><Unique value=\"False\"></Unique><Existing value=\"False\"></Existing><StrictValidation value=\"False\"></StrictValidation></Validation><Storage autoIndex=\"True\" index=\"None\" indexLanguage=\"English\" global=\"False\" maxRepetition=\"1\"></Storage></Field>"
		
		on run
			--set objTrans to fmObjectTranslator_Instantiate({})
			
			
			
			set buildingXML to headerXML
			
			
			repeat with oneFieldName in fieldNameList
				set oneFieldName to contents of oneFieldName
				set oneFieldName to oneFieldName as string
				
				if length of oneFieldName is greater than 0 then
					
					set {tocName, fieldNameShort} to parseChars({oneFieldName, "::"})
					
					set oneFieldDefXML to templateFieldDefStartXML & fieldNameShort & templateFieldDefEndXML
					
					set buildingXML to buildingXML & return & oneFieldDefXML
				end if
			end repeat
			
			
			set buildingXML to buildingXML & return & footerXML
			
			set currentCode of objTrans to "XMFD"
			
			set newObjects to convertXmlToObjects(buildingXML) of objTrans
			
			
			set fmClipboard to get the clipboard
			
			set newClip to {Çclass XMFDÈ:newObjects} & fmClipboard
			
			set the clipboard to newClip
			
			return buildingXML
			
			
			
		end run
		
	end script
	
	
	run fieldsToFieldDefs
	
end addFieldsAsFieldDefs







on addFieldsAsScriptSteps(fieldNameList)
	
	script fieldsToScriptSteps
		
		property headerScriptStepsXML : "<fmxmlsnippet type=\"FMObjectList\">"
		property footerScriptStepsXML : "</fmxmlsnippet>"
		property stepStartXML : "<Step enable=\"True\" id=\"76\" name=\"Set Field\">"
		property stepEndXML : "</Step>"
		property calcPrefixXML : "<Calculation><![CDATA["
		property calcSuffixXML : "]]></Calculation>"
		property setFieldPrefixXML : "<Field table=\""
		property setFieldBetweenTableAndFieldNameXML : "\" id=\"19\" name=\""
		property setFieldSuffixXML : "\"></Field>"
		
		on run
			--set objTrans to fmObjectTranslator_Instantiate({})
			
			
			set fieldNamesListAsText to unParseChars(fieldNameList, return)
			
			set buildingXML to headerScriptStepsXML
			
			
			repeat with oneFieldName in fieldNameList
				set oneFieldName to contents of oneFieldName
				set oneFieldName to oneFieldName as string
				
				if length of oneFieldName is greater than 0 then
					
					set {tocName, fieldNameShort} to parseChars({oneFieldName, "::"})
					
					set oneScriptStep to ""
					set oneScriptStep to oneScriptStep & stepStartXML
					set oneScriptStep to oneScriptStep & calcPrefixXML
					set oneScriptStep to oneScriptStep & oneFieldName
					set oneScriptStep to oneScriptStep & calcSuffixXML
					set oneScriptStep to oneScriptStep & setFieldPrefixXML
					set oneScriptStep to oneScriptStep & tocName
					set oneScriptStep to oneScriptStep & setFieldBetweenTableAndFieldNameXML
					set oneScriptStep to oneScriptStep & fieldNameShort
					set oneScriptStep to oneScriptStep & setFieldSuffixXML
					set oneScriptStep to oneScriptStep & stepEndXML
					
					set buildingXML to buildingXML & return & oneScriptStep
				end if
				
			end repeat
			
			
			set buildingXML to buildingXML & return & footerScriptStepsXML
			
			set currentCode of objTrans to "XMSS"
			
			set scriptStepsObjects to convertXmlToObjects(buildingXML) of objTrans
			
			
			set fmClipboard to get the clipboard
			
			set newClip to {Çclass XMSSÈ:scriptStepsObjects} & fmClipboard
			
			set the clipboard to newClip
			
			return buildingXML
			
			
			
		end run
		
	end script
	
	
	run fieldsToScriptSteps
	
end addFieldsAsScriptSteps







on preserveClipboard()
	
	set clipInfo to (clipboard info)
	set savedClipboard to {}
	set alreadySavedClasses to {}
	repeat with oneClip in clipInfo
		set oneClipClass to get item 1 of oneClip
		
		if alreadySavedClasses does not contain oneClipClass then
			set oneClipData to (get the clipboard as oneClipClass)
			set oneClipDataAsString to coerceToString(oneClipData)
			
			if oneClipClass is string then
				set savedClipboard to savedClipboard & {string:oneClipData}
				
			else if oneClipClass is Çclass utf8È then
				set savedClipboard to savedClipboard & {Çclass utf8È:oneClipData}
				
			else if oneClipClass is Unicode text then
				set savedClipboard to savedClipboard & {Unicode text:oneClipData}
				
			else if oneClipClass is Çclass ut16È then
				set savedClipboard to savedClipboard & {Çclass ut16È:oneClipData}
				
			else if oneClipClass is Çclass furlÈ then
				-- SKIP FOR NOW - CAUSES ERRORS!!!
				--set savedClipboard to savedClipboard & {Çclass furlÈ:oneClipData}
				
			else
				set oneClipClassAsString to coerceToString(oneClipClass)
				if oneClipClassAsString does not start with "Çclass " then
					set oneClipClassAsString to "Çclass " & text 7 thru 10 of oneClipDataAsString & "È"
				end if
				
				set scriptCode to Â
					"set savedClipboard to " & coerceToString(savedClipboard) & return Â
					& "set savedClipboard to savedClipboard & {" & oneClipClassAsString & ": " & oneClipDataAsString & "}" & return Â
					& "return savedClipboard"
				
				set savedClipboard to run script scriptCode
			end if
			
		end if
		
	end repeat
	
	return savedClipboard
	
	
	
end preserveClipboard





on coerceToString(incomingObject)
	-- version 1.8, Daniel A. Shockley, http://www.danshockley.com
	-- 1.8 - instead of trying to store the error message use, generate it
	-- 1.7 -  added "Can't make " with a curly single-quote. 
	-- 1.6 -  can add additional errMsg parts (just add to lists to handle other languages. 
	--             Currently handles English in both 10.3 and 10.4 (10.3 uses " into a number." 
	--             while 10.4 uses " into type number.")
	-- 1.5 -  added Unicode Text
	
	set errMsgLeadList to {"Can't make ", "CanÕt make "}
	set errMsgTrailList to {" into a number.", " into type number."}
	
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
				"XXXX" as number
				-- GENERATE the error message for a known string so we can get 
				-- the 'lead' and 'trail' part of the error message
			on error errMsg number errNum
				set {oldDelims, AppleScript's text item delimiters} to {AppleScript's text item delimiters, {"\"XXXX\""}}
				set {errMsgLead, errMsgTrail} to text items of errMsg
				set AppleScript's text item delimiters to oldDelims
			end try
			
			
			set testMultiply to 1 * incomingObject -- now, generate error message for OUR item
			
			-- what items is THIS used for?
			-- how does script ever get past the above step??
			set listText to (first character of incomingObject)
			
		on error errMsg
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
			
			
			set {text:objectString} to (objectString as string)
		end try
		
		return objectString
	end if
end coerceToString







on unParseChars(thisList, newDelim)
	-- version 1.2, Daniel A. Shockley, http://www.danshockley.com
	set oldDelims to AppleScript's text item delimiters
	try
		set AppleScript's text item delimiters to the {newDelim as string}
		set the unparsedText to thisList as string
		set AppleScript's text item delimiters to oldDelims
		return unparsedText
	on error errMsg number errNum
		try
			set AppleScript's text item delimiters to oldDelims
		end try
		error "ERROR: unParseChars() handler: " & errMsg number errNum
	end try
end unParseChars



on getTextBetweenMultiple(sourceText, beforeText, afterText)
	-- version 1.2
	-- gets the text between all occurrences of beforeText and afterText in sourceText, and returns a list of strings
	-- the beforeText and afterText cannot overlap (ie. cannot parse "<LI>Apple<LI>Orange</UL>" using "<LI>" and "<")
	-- NEEDs parseChars()
	try
		
		set parsedByBefore to my parseChars({sourceText, beforeText})
		if length of parsedByBefore is 1 then return {}
		set parsedByBefore to items 2 through -1 of parsedByBefore
		
		set foundTextList to {}
		repeat with oneParsedSection in parsedByBefore
			set parsedList to my parseChars({oneParsedSection as string, afterText})
			if length of parsedList is not 1 then
				copy (item 1 of parsedList) as string to end of foundTextList
			end if
			
		end repeat
		
		return foundTextList
	on error errMsg number errNum
		-- will not error if parsing datum not found, will return empty list (see above)
		error "getTextBetweenMultiple FAILED: " & errMsg number errNum
		
	end try
end getTextBetweenMultiple








on parseChars(prefs)
	-- version 1.3, Daniel A. Shockley, http://www.danshockley.com
	
	-- 1.3 - default is to consider case
	
	set defaultPrefs to {considerCase:true}
	
	
	if class of prefs is list then
		if (count of prefs) is greater than 2 then
			-- get any parameters after the initial 3
			set prefs to {sourceText:item 1 of prefs, parseString:item 2 of prefs, considerCase:item 3 of prefs}
		else
			set prefs to {sourceText:item 1 of prefs, parseString:item 2 of prefs}
		end if
		
	else if class of prefs is not equal to (class of {someKey:3}) then
		-- Test by matching class to something that IS a record to avoid FileMaker namespace conflict with the term "record"
		
		error "The parameter for 'parseChars()' should be a record or at least a list. Wrap the parameter(s) in curly brackets for easy upgrade to 'parseChars() version 1.3. " number 1024
		
	end if
	
	
	set prefs to prefs & defaultPrefs
	
	
	set sourceText to sourceText of prefs
	set parseString to parseString of prefs
	set considerCase to considerCase of prefs
	
	
	set oldDelims to AppleScript's text item delimiters
	try
		set AppleScript's text item delimiters to the {parseString as string}
		
		if considerCase then
			considering case
				set the parsedList to every text item of sourceText
			end considering
		else
			ignoring case
				set the parsedList to every text item of sourceText
			end ignoring
		end if
		
		set AppleScript's text item delimiters to oldDelims
		return parsedList
	on error errMsg number errNum
		try
			set AppleScript's text item delimiters to oldDelims
		end try
		error "ERROR: parseChars() handler: " & errMsg number errNum
	end try
end parseChars



on logConsole(processName, consoleMsg)
	-- version 1.8 - Daniel A. Shockley, http://www.danshockley.com
	
	-- 1.8 - coerces to string first (since numbers would not directly convert for 'quoted form'
	-- 1.7 - now works with Leopard by using the "logger" command instead of just appending to log file
	-- 1.6- the 'space' constant instead of literal spaces for readability, removed trailing space from the hostname command
	-- 1.5- uses standard date-stamp format	
	
	set shellCommand to "logger" & space & "-t" & space & quoted form of processName & space & quoted form of (consoleMsg as string)
	
	do shell script shellCommand
	return shellCommand
end logConsole



on getXMLElementsByName(search_name, search_xml_element)
	-- version 2014-12-10-danshockley
	-- based on code by adamh on stackoverflow.com, 2014-01-22, http://stackoverflow.com/a/21282921
	
	set foundElems to {}
	
	using terms from application "System Events"
		tell search_xml_element
			set c to the count of XML elements
			repeat with i from 1 to c
				if (the name of XML element i is search_name) then
					copy XML element i to end of foundElems
				end if
				
				if (the (count of XML elements of XML element i) > 0) then
					set children_found to my getXMLElementsByName(search_name, XML element i)
					if (the (count of children_found) > 0) then
						set foundElems to foundElems & children_found
					end if
				end if
				
			end repeat
		end tell
	end using terms from
	
	return foundElems
	
end getXMLElementsByName





on flattenList(nestedList)
	-- version 1.1, Daniel A. Shockley, http://www.danshockley.com
	
	(* 
	VERSION HISTORY
	1.1 - had to stop using variable sublist due to namespace conflict; added error-trapping.
	*)
	
	try
		set newList to {}
		repeat with anItem in nestedList
			set anItem to contents of anItem
			if class of anItem is list then
				set partialSubList to my flattenList(anItem)
				repeat with oneSubItem in partialSubList
					set oneSubItem to contents of oneSubItem
					copy oneSubItem to end of newList
				end repeat
			else
				
				copy anItem to end of newList
			end if
		end repeat
		
		return newList
		
	on error errMsg number errNum
		error "ERROR: flattenList() handler: " & errMsg number errNum
	end try
end flattenList


on trimWhitespace(inputString)
	-- version 1.1: 
	
	-- 1.1 - changed to correctly handle when the whole input string is whitespace
	-- 1.0 - loop actually works, since the ASTIDs method fails with return / ascii character 13
	-- note also that the "contains" AppleScript function breaks with ASCII character 13
	-- that is why a list of ASCII numbers is used, instead of a list of strings
	set whiteSpaceAsciiNumbers to {13, 10, 32, 9}
	
	set textLength to length of inputString
	if textLength is 0 then return ""
	set endSpot to -textLength -- if only whitespace is found, will chop whole string
	
	-- chop from end
	set i to -1
	repeat while -i is less than or equal to textLength
		set testChar to text i thru i of inputString
		if whiteSpaceAsciiNumbers does not contain (ASCII number testChar) then
			set endSpot to i
			exit repeat
		end if
		set i to i - 1
	end repeat
	
	
	if -endSpot is equal to textLength then
		if whiteSpaceAsciiNumbers contains (ASCII number testChar) then return ""
	end if
	
	set inputString to text 1 thru endSpot of inputString
	set textLength to length of inputString
	set newStart to 1
	
	-- chop from beginning
	set i to 1
	repeat while i is less than or equal to textLength
		set testChar to text i thru i of inputString
		if whiteSpaceAsciiNumbers does not contain (ASCII number testChar) then
			set newStart to i
			exit repeat
		end if
		set i to i + 1
	end repeat
	
	set inputString to text newStart thru textLength of inputString
	
	return inputString
	
end trimWhitespace





