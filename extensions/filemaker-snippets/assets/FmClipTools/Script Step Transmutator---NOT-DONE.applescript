-- Script Step Transmutator
-- version 1.0, Daniel A. Shockley

-- Takes 'Perform Find' script step object in clipboard and converts to multiple script steps specifying a Find in detail. 

-- VERSION HISTORY: 
-- 1.0 - 2017-01-17 ( dshockley ) - original version using fmObjectTranslator 2.6.






(*

NOT DONE!!!   NOT DONE!!!   NOT DONE!!!   NOT DONE!!!   NOT DONE!!!   NOT DONE!!!   
NOT DONE!!!   NOT DONE!!!   NOT DONE!!!   NOT DONE!!!   NOT DONE!!!   NOT DONE!!!   

2017-01-18 ( dshockley ): not sure if this project is that useful. Perhaps a project for later. Might be more useful to swap particular types of script steps. E.g. transmutate "Set Variable [ $someVar ; MyTable::SomeField ]" into "Set Field [ MyTable::SomeField ; $someVar ]"

NOT DONE!!!   NOT DONE!!!   NOT DONE!!!   NOT DONE!!!   NOT DONE!!!   NOT DONE!!!   
NOT DONE!!!   NOT DONE!!!   NOT DONE!!!   NOT DONE!!!   NOT DONE!!!   NOT DONE!!!   

*)





property debugMode : true

property needsDataTypeWarning : ""


on run
	
	
	
	
	
	if debugMode then
		-- DEBUGGING CODE!!!!!!
		set sampleFilePath to ((path to desktop) as string) & "sample-script-steps.xml"
		set origXML to read file sampleFilePath
		
	else
		set objTrans to fmObjectTranslator_Instantiate({})
		set origXML to clipboardGetObjectsAsXML({}) of objTrans
		
	end if
	
	
	
	
	
	
	
	
	set detailedFindXML to ""
	
	set onFirstRequest to true
	
	tell application "System Events"
		
		set frontAppName to name of first application process whose frontmost is true
		
		
		set xmlData to make new XML data with data origXML
		
		
		set stepTypes to value of XML attribute "name" of (every XML element of XML element "fmxmlsnippet" of xmlData)
		
		set stepTypes to my listUniqueValues({inputList:stepTypes})
	end tell
	
	
	
	tell me
		set chosenStepName to choose from list stepTypes with title "Choose which type of script step to extract from:" OK button name "Choose"
	end tell
	
	
	
	tell application "System Events"
		
		
		set chosenSteps to (every XML element of XML element "fmxmlsnippet" of xmlData whose value of XML attribute "name" is chosenStepName)
		
		name of every XML element of first item of chosenSteps
		return result
		
		
		
		
		
		
		
		
		
		
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


on listUniqueValues(prefs)
	-- version 1.0
	
	set inputList to inputList of prefs
	
	set uniqueList to {}
	
	
	repeat with oneItem in inputList
		set oneItem to contents of oneItem
		if uniqueList does not contain oneItem then
			copy oneItem to end of uniqueList
		end if
	end repeat
	
	return uniqueList
	
end listUniqueValues




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






