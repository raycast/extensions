-- Params as JSON Script Steps to Template Calc
-- version 2024-01-25, Daniel A. Shockley

(*
	Takes 'Set Variable' script step objects in clipboard and makes a template calculation to call the script. 
	The parameter variables should either be pulled directly from Get ( ScriptParameter ) or from a variable 
	set earlier. Note that the variable name must MATCH EXACTLY the key used in the JSON sent as the 
	parameter. The Set Variable step can also contain a comment explaining the param, which will be 
	brought into the template calc. 

	Example 1:
	Set Variable [ $SomeParam1 ; Value: JSONGetElement ( Get ( ScriptParameter ) ; "SomeParam1" ) ]

	Example 2:
	Set Variable [ $paramsJSON ; Value: Get ( ScriptParameter ) ]
	Set Variable [ $SomeParam1 ; Value: JSONGetElement ( $paramsJSON ; "SomeParam1" ) ]

	OUTPUT: 
	JSONSetElement ( "{}"
		; [ "SomeParam1" ; "Whatever the SomeParam1 should be" ; JSONString ]
		)
		
	Note that the JSON data type will be JSONString unless the script step using GetJParam specifies some other data type (Text,Number,Date, etc.). 

	HISTORY: 
		2024-01-25 ( danshockley ): In getParamCalc, make sure jsonType is set to SOMETHING. 
		2024-01-18 ( danshockley ): If the script step using GetJParam specifies what data type the variable should be, also use the matching JSON data type in the template calc generated. 
		2023-11-14 ( danshockley ): If the useShockleyCustomFunctions property is set, use the CallStack custom function in the param template.
		2023-10-28 ( danshockley ): Support GetJParam custom function in addition to just JSONGetElement. 
		2023-06-16 ( danshockley ): Updates to comments. 
		2023-05-24 ( danshockley ): Added examples. Removed references to defaultValue, callStack, and other more-involved coding standards not widely used in the community. Finished a workable version. 
		2023-03-25 ( danshockley ): First created. Based off of "Param Script Steps to Template Calc" (was SFR dictinoary param-passing).
*)

property debugMode : false

property useShockleyCustomFunctions : false

on run
	
	if ((path to home folder) as string) contains ":danshock:" then
		-- custom option that most will not use, so set only for author.
		set useShockleyCustomFunctions to true
	end if
	
	-- load the translator library:
	set transPath to (((((path to me as text) & "::") as alias) as string) & "fmObjectTranslator.applescript")
	set objTrans to run script (transPath as alias)
	(* If you need a self-contained script, copy the code from fmObjectTranslator into this script and use the following instead of the run script step above:
			set objTrans to fmObjectTranslator_Instantiate({})
		*)
	
	set svXML to clipboardGetObjectsAsXML({}) of objTrans
	
	
	set paramCalcSample to ""
	
	set onFirstParam to true
	
	tell application "System Events"
		set xmlData to make new XML data with data svXML
		
		set scriptStepElements to every XML element of XML element "fmxmlsnippet" of xmlData whose name is "Step"
		
		
		repeat with oneScriptStepElement in scriptStepElements
			
			
			if value of XML attribute "name" of oneScriptStepElement is not "Set Variable" then
				-- not a Set Variable script step, so ignore it.
			else
				
				set varName to value of XML element "Name" of oneScriptStepElement
				
				if varName is "$paramsJSON" or varName is "$params" then
					-- if the user highlighted one of these, ignore it.	
				else -- some param
					
					set valueCalcCDATA to value of XML element "Calculation" of XML element "Value" of oneScriptStepElement
					
					if valueCalcCDATA does not contain "JSONGetElement" and valueCalcCDATA does not contain "GetJParam" then
						-- this is NOT a parameter variable being pulled, so ignore it.
						
					else
						-- this IS a parameter variable being pulled, so process it:
						
						-- get the param name (JSON key) by nibbling away: 
						set oneParamName to valueCalcCDATA
						set oneParamName to my getTextAfter(oneParamName, "GetJParam")
						set oneParamName to my getTextAfter(oneParamName, "(")
						set oneParamName to my getTextAfter(oneParamName, "\"")
						set oneParamName to my getTextBefore(oneParamName, "\"")
						
						
						-- get the param data type (if any) by nibbling away: 
						set oneParamDataType to valueCalcCDATA
						set oneParamDataType to my getTextAfter(oneParamDataType, oneParamName & "\"")
						set oneParamDataType to my getTextAfter(oneParamDataType, "\"")
						set oneParamDataType to my getTextBefore(oneParamDataType, "\"")
						
						set oneParamComment to my getTextAfter(valueCalcCDATA, "//")
						
						if length of oneParamComment is 0 then
							set blockComment to my getTextAfter(valueCalcCDATA, "/*")
							if length of blockComment is greater than 0 then
								set oneParamComment to my getTextBefore(blockComment, "*/")
							end if
							
						end if
						
						
						set oneParamComment to my trimWhitespace(oneParamComment)
						
						-- get one of the pieces of the calc:
						set oneParamCalc to my getParamCalc(oneParamName, oneParamComment, onFirstParam, oneParamDataType)
						-- stitch them together appropriately (1st gets special handling):
						if onFirstParam then
							set paramCalcSample to paramCalcSample & oneParamCalc
							set onFirstParam to false
						else
							set paramCalcSample to paramCalcSample & return & oneParamCalc
						end if
						
					end if
					
				end if
				
			end if
			
		end repeat
		
		set paramCalcSample to paramCalcSample & return & tab & ")"
		
		set fmClipboard to get the clipboard
		
		set newClip to {string:paramCalcSample} & fmClipboard
		
		set the clipboard to newClip
		
		return true
		
	end tell
	
end run



on getParamCalc(paramName, paramComment, isFirstParam, paramDataType)
	
	
	(* HISTORY
		2024-01-25 ( danshockley ): Make sure jsonType is set to SOMETHING. 
		2024-01-18 ( danshockley ): added paramDataType to this handler's incoming parameters.
	*)
	
	(* Note: Any dates/times/timestamps must be specified as JSONString in the params. Script will convert. *)
	(* Note: If the key is not in the JSON, GetJParam will not set the variable. *)
	if length of paramDataType is 0 then
		set jsonType to "JSONString"
	else if paramDataType is "Number" then
		set jsonType to "JSONNumber"
	else if paramDataType is "Boolean" then
		set jsonType to "JSONBoolean"
	else if paramDataType is "Date" then
		set jsonType to "JSONString"
	else if paramDataType is "Time" then
		set jsonType to "JSONString"
	else if paramDataType is "Timestamp" then
		set jsonType to "JSONString"
	else
		set jsonType to "JSONString"
	end if
	
	
	set paramCalc to tab & "; [ \"###PARAM_NAME###\" ;  ; " & jsonType & " ]"
	if length of paramComment is greater than 0 then -- need to append the comment
		set paramCalc to paramCalc & "    /* " & paramComment & " */"
	end if
	
	set paramCalc to replaceSimple({paramCalc, "###PARAM_NAME###", paramName})
	
	if isFirstParam then
		if useShockleyCustomFunctions then
			set paramCalc to "Parameters:" & return & return & Â
				"JSONSetElement ( CallStack ( \"JSON\" )" & return & paramCalc
		else
			set paramCalc to "Parameters:" & return & return & Â
				"JSONSetElement ( \"{}\" " & return & paramCalc
		end if
	end if
	
	return paramCalc
	
end getParamCalc




on getTextAfter(sourceText, afterThis)
	-- version 1.2, Daniel A. Shockley, http://www.danshockley.com
	
	-- gets ALL text from source after marker, not just through next occurrence
	-- 1.2 - changed to get ALL, not thru next occurrence, which changes behavior to match handler NAME
	
	try
		set {oldDelims, AppleScript's text item delimiters} to {AppleScript's text item delimiters, {afterThis}}
		
		if (count of text items of sourceText) is 1 then
			-- the split-string didn't appear at all
			set AppleScript's text item delimiters to oldDelims
			return ""
		else
			set the resultAsList to text items 2 thru -1 of sourceText
		end if
		set AppleScript's text item delimiters to {afterThis}
		set finalResult to resultAsList as string
		set AppleScript's text item delimiters to oldDelims
		return finalResult
	on error errMsg number errnum
		set AppleScript's text item delimiters to oldDelims
		return "" -- return nothing if the stop text is not found
	end try
end getTextAfter



on getTextBefore(sourceText, stopHere)
	-- version 1.1, Daniel A. Shockley, http://www.danshockley.com
	-- gets the text before the first occurrence stopHere
	try
		set {oldDelims, AppleScript's text item delimiters} to {AppleScript's text item delimiters, stopHere}
		if (count of text items of sourceText) is 1 then
			set AppleScript's text item delimiters to oldDelims
			return ""
		else
			set the finalResult to text item 1 of sourceText
		end if
		set AppleScript's text item delimiters to oldDelims
		return finalResult
	on error errMsg number errnum
		set AppleScript's text item delimiters to oldDelims
		return "" -- return nothing if the stop text is not found
	end try
end getTextBefore


on trimWhitespace(inputString)
	-- version 1.2: 
	
	set whiteSpaceAsciiNumbers to {13, 10, 32, 9} -- characters that count as whitespace.
	
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







