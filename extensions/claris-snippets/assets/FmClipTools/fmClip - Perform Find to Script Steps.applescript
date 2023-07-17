-- Perform Find to Script Steps
-- version 4.0, Daniel A. Shockley, Erik Shagdar
-- Takes 'Perform Find' script step object in clipboard and converts to multiple script steps specifying a Find in detail. 

-- 4.0 - 2018-04-04 ( dshockley/eshagdar ): load fmObjectTranslator code by reference instead of embedded.
-- 3.9.3 - 2017-08-09 ( eshagdar ): renamed 'Perform Find to Script Steps' to 'fmClip - Perform Find to Script Steps' to match other handler name pattern
-- 3.9.2 - warn the user if any of the search-values need to be checked for data-type validity by inserting a Comment script step; also auto-pastes now. 
-- 3.8 - double-check warning for ellipsis (and three dots).


property debugMode : false

property needsDataTypeWarning : ""


on run
	
	set objTrans to run script alias (((((path to me as text) & "::") as alias) as string) & "fmObjectTranslator.applescript")
	(* If you need a self-contained script, copy the code from fmObjectTranslator into this script and use the following instead of the run script step above:
			set objTrans to fmObjectTranslator_Instantiate({})
	*)
	
	set pfXML to clipboardGetObjectsAsXML({}) of objTrans
	
	set detailedFindXML to ""
	
	set needsDataTypeWarning to false -- init
	set onFirstRequest to true
	
	tell application "System Events"
		set xmlData to make new XML data with data pfXML
		set scriptStepElement to XML element "Step" of XML element "fmxmlsnippet" of xmlData
		
		if (value of XML attribute "name" of scriptStepElement) is not "Perform Find" then return false
		
		set queryElement to XML element "Query" of scriptStepElement
		
		
		set requestRowElements to (every XML element of queryElement whose name is "RequestRow")
		
		repeat with oneRequestRowElement in requestRowElements
			
			if not onFirstRequest then
				set detailedFindXML to detailedFindXML & return & my getXmlNewRequest()
			else
				set onFirstRequest to false
			end if
			
			if (value of XML attribute "operation" of oneRequestRowElement) is "Exclude" then
				set detailedFindXML to detailedFindXML & return & my getXmlOmit()
			end if
			
			set criteriaElements to (every XML element of oneRequestRowElement whose name is "Criteria")
			
			repeat with oneCriteriaElement in criteriaElements
				
				set fieldElement to XML element "Field" of oneCriteriaElement
				set tableName to value of XML attribute "table" of fieldElement
				set fieldName to value of XML attribute "name" of fieldElement
				
				set textElement to XML element "Text" of oneCriteriaElement
				set textValue to value of textElement
				
				if "><²³=" contains (text 1 thru 1 of textValue) or textValue contains "É" or textValue contains "..." then
					-- some operator, so WARN: 
					set textValue to textValue & "  // DOUBLE-CHECK THIS!!!!"
					set needsDataTypeWarning to true
					
				end if
				
				set oneSetFieldXML to my getXmlSetField(tableName, fieldName, textValue)
				set detailedFindXML to detailedFindXML & return & oneSetFieldXML
				
			end repeat
			
			
			
		end repeat
		
		
		
		
		set detailedFindXML to my xmlFindStart() & return & detailedFindXML & return & my xmlFindEnd()
		
		
		set currentCode of objTrans to "XMSS"
		set scriptStepsObjects to convertXmlToObjects(detailedFindXML) of objTrans
		
		set newClip to {Çclass XMSSÈ:scriptStepsObjects}
		
		set the clipboard to newClip
		
	end tell
	
	
	
	tell application "System Events"
		keystroke "v" using command down
	end tell
	
	
	
	return true
	
	
	
	
	
end run



on getXmlNewRequest()
	return "<Step enable=\"True\" id=\"7\" name=\"New Record/Request\"></Step>"
end getXmlNewRequest


on getXmlOmit()
	return "<Step enable=\"True\" id=\"25\" name=\"Omit Record\"></Step>"
end getXmlOmit



on getXmlSetField(tocName, fieldName, cdataString)
	
	set templateXML to "<Step enable=\"True\" id=\"76\" name=\"Set Field\">
<Calculation>
<![CDATA[\"###CDATA###\"]]>
</Calculation>
<Field table=\"###TOCNAME###\" id=\"999\" name=\"###FIELDNAME###\">
</Field>
</Step>"
	
	
	set xmlSetField to templateXML
	set xmlSetField to replaceSimple({xmlSetField, "###TOCNAME###", tocName})
	set xmlSetField to replaceSimple({xmlSetField, "###FIELDNAME###", fieldName})
	set xmlSetField to replaceSimple({xmlSetField, "###CDATA###", cdataString})
	
	return xmlSetField
	
	
end getXmlSetField



on xmlFindStart()
	
	set xmlHeader to "<fmxmlsnippet type=\"FMObjectList\">"
	
	set warningCommentXML to "<Step enable=\"True\" id=\"89\" name=\"comment\">
<Text>WARNING! The script step was converted, but the data-type of some search values may not working properly without adjustment to an operator (ellipsis, ineqaulity operators, etc), as the single-step Perform Find uses raw text strings as opposed to valid FileMaker calculations.</Text>
</Step>"
	
	
	set enterFindModeXML to "<Step enable=\"True\" id=\"22\" name=\"Enter Find Mode\">
<Pause state=\"False\">
</Pause>
<Restore state=\"False\">
</Restore>
</Step>
"
	
	set outputXML to xmlHeader
	
	if needsDataTypeWarning then
		set outputXML to outputXML & return & warningCommentXML
	end if
	
	set outputXML to outputXML & return & enterFindModeXML
	
	return outputXML
	
	
end xmlFindStart



on xmlFindEnd()
	return "<Step enable=\"True\" id=\"28\" name=\"Perform Find\">
<Restore state=\"False\">
</Restore>
</Step>
</fmxmlsnippet>"
	
end xmlFindEnd









on somePerformFindScriptStepXML()
	-- used when testing, as an example canned Perform Find. 
	
	return "<fmxmlsnippet type=\"FMObjectList\"><Step enable=\"True\" id=\"28\" name=\"Perform Find\"><Restore state=\"True\"></Restore><Query><RequestRow operation=\"Include\"><Criteria><Field table=\"C_WORKER\" id=\"37\" name=\"a16C_DriveID\"></Field><Text>dv316</Text></Criteria><Criteria><Field table=\"C_WORKER\" id=\"84\" name=\"b16C_AdrApt\"></Field><Text>2F</Text></Criteria></RequestRow><RequestRow operation=\"Exclude\"><Criteria><Field table=\"C_WORKER\" id=\"92\" name=\"b16C_BargainingUnit\"></Field><Text>YES</Text></Criteria><Criteria><Field table=\"C_WORKER\" id=\"32956\" name=\"b16C_Active__b\"></Field><Text>1</Text></Criteria></RequestRow></Query></Step></fmxmlsnippet>"
	
	(*
	return "<fmxmlsnippet type=\"FMObjectList\">
<Step enable=\"True\" id=\"28\" name=\"Perform Find\"><Restore state=\"True\"></Restore><Query><RequestRow operation=\"Include\"><Criteria><Field table=\"C_WORKER\" id=\"37\" name=\"a16C_DriveID\"></Field><Text>dv316</Text></Criteria><Criteria><Field table=\"C_WORKER\" id=\"92\" name=\"b16C_BargainingUnit\"></Field><Text>YES</Text></Criteria><Criteria><Field table=\"C_WORKER\" id=\"32956\" name=\"b16C_Active__b\"></Field><Text>1</Text></Criteria></RequestRow></Query></Step>
</fmxmlsnippet>"
	*)
end somePerformFindScriptStepXML





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





