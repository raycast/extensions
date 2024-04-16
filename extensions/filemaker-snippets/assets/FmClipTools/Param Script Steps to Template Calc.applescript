-- Param Script Steps to Template Calc
-- version 2023-03-25, Daniel A. Shockley

(*
	Takes 'Set Variable' (script parameter = #P) script step objects in clipboard and makes a template calculation. 
	NOTE: This is using a standardized method of SixFriedRiced dictionary associative arrays for param-passing. 

	HISTORY: 
		2023-03-25 ( dshockley ): Load fmObjectTranslator externally. 
		1.7 - 2017-12-18 ( dshockley ): added space before semi-colon in sample calc template. Updated fmObjectTranslator from 3.9 to 3.9.3. 
		1.6 - 2017-08-31 ( dshockley ): always put NoDialogs at the end, right before CallStack, instead of first.
		1.5 - 2016-11-17 ( dshockley ): always append CallStack.
		1.4 - 2016-10-07 ( dshockley ): handles block comments and returns all as block comments; updated fmObject to 3.1.
		1.3 - Fixed bugs from 1.2; don't treat defaults of NULL (or "") as having defaults. 
		1.2 - added ability to get Set Variable steps that set a default value rather than #P (probably get replaced in script later by a DictToVariables call. 
		1.1 - added getting the parameter's comment from within the Value section of the Set Variable script step. 
*)

property debugMode : false


on run
	
	
	-- load the translator library:
	set transPath to (((((path to me as text) & "::") as alias) as string) & "fmObjectTranslator.applescript")
	set objTrans to run script (transPath as alias)
	(* If you need a self-contained script, copy the code from fmObjectTranslator into this script and use the following instead of the run script step above:
			set objTrans to fmObjectTranslator_Instantiate({})
		*)
	
	set svXML to clipboardGetObjectsAsXML({}) of objTrans
	
	
	-- SAMPLE TEST CODE:	set svXML to someSetVarScriptStepXML()
	
	set paramCalcSample to ""
	
	set onFirstParam to true
	
	tell application "System Events"
		set xmlData to make new XML data with data svXML
		
		set scriptStepElements to every XML element of XML element "fmxmlsnippet" of xmlData whose name is "Step"
		
		
		set hasParam_NoDialogs to false
		repeat with oneScriptStepElement in scriptStepElements
			
			if value of XML attribute "name" of oneScriptStepElement is not "Set Variable" then
				-- not a Set Variable script step, so ignore it.
			else
				
				set varName to value of XML element "Name" of oneScriptStepElement
				
				
				if varName is "$setCallStack" then
					-- do NOT try to put this into the sample params.
				else if varName is "$params" then
					-- if the user highlighted this, ignore it.	
				else if varName is "$NoDialogs" then
					-- make note that this is present, but don't insert it here. It will be added at the end.
					set hasParam_NoDialogs to true
					
				else -- some param
					
					set valueCalcCDATA to value of XML element "Calculation" of XML element "Value" of oneScriptStepElement
					
					
					set oneParamComment to my getTextAfter(valueCalcCDATA, "//")
					
					if length of oneParamComment is 0 then
						set blockComment to my getTextAfter(valueCalcCDATA, "/*")
						if length of blockComment is greater than 0 then
							set oneParamComment to my getTextBefore(blockComment, "*/")
						end if
						
					end if
					
					
					
					set oneParamComment to my trimWhitespace(oneParamComment)
					
					if valueCalcCDATA contains "#P" then
						set varFromDict to true
						set defaultValue to ""
					else
						set varFromDict to false
						if valueCalcCDATA begins with "\"\"" or valueCalcCDATA begins with "NULL" then
							set defaultValue to "NULL"
						else
							set defaultValue to my getTextBefore(valueCalcCDATA, "//")
							
						end if
						
					end if
					
					
					-- Remove leading "$" - 
					set oneParamName to text 2 thru -1 of varName
					
					if onFirstParam then
						set paramCalcSample to paramCalcSample & my getParamCalc(oneParamName, oneParamComment, varFromDict, onFirstParam, defaultValue)
						set onFirstParam to false
					else
						set paramCalcSample to paramCalcSample & return & my getParamCalc(oneParamName, oneParamComment, varFromDict, onFirstParam, defaultValue)
					end if
					
				end if
				
			end if
			
		end repeat
		
		if hasParam_NoDialogs then
			
			set paramCalcSample to paramCalcSample & return & "&	# ( \"NoDialogs\" ;  )    /* OPTIONAL */"
		end if
		
		set paramCalcSample to paramCalcSample & return & return & "&	CallStack ( \"\" )"
		
		
		set fmClipboard to get the clipboard
		
		set newClip to {string:paramCalcSample} & fmClipboard
		
		set the clipboard to newClip
		
		return true
		
	end tell
	
end run



on getParamCalc(paramName, paramComment, varFromDict, isFirstParam, defaultValue)
	
	if varFromDict then
		if length of paramComment is 0 then -- NO comment
			set paramCalc to "# ( \"###PARAM_NAME###\" ;  ) "
			
		else -- HAS comment
			set paramCalc to "# ( \"###PARAM_NAME###\" ;  )    /* " & paramComment & " */"
		end if
		
	else -- NOT varFromDict
		
		if defaultValue is "NULL" then
			if length of paramComment is 0 then
				set paramCalc to "# ( \"###PARAM_NAME###\" ;  ) "
				
			else -- HAS comment
				set paramCalc to "# ( \"###PARAM_NAME###\" ;  )    /* " & paramComment & " */"
			end if
			
		else -- HAS Default that is NOT NULL:
			if length of paramComment is 0 then -- NO comment:
				set paramCalc to "//# ( \"###PARAM_NAME###\" ;  )    // DEFAULT: " & defaultValue
				
			else -- HAS comment:
				set paramCalc to "//# ( \"###PARAM_NAME###\" ;  )    /* DEFAULT: " & defaultValue & "// " & paramComment & " */"
			end if
		end if
		
		-- END: NOT varFromDict
	end if
	
	set paramCalc to replaceSimple({paramCalc, "###PARAM_NAME###", paramName})
	
	if isFirstParam then
		set paramCalc to "Parameters:" & return & return & tab & paramCalc
	else
		set paramCalc to "&" & tab & paramCalc
		
	end if
	
	return paramCalc
	
end getParamCalc




on someSetVarScriptStepXML()
	
	
	return "<fmxmlsnippet type=\"FMObjectList\">
<Step enable=\"True\" id=\"141\" name=\"Set Variable\">
<Value>
<Calculation>
<![CDATA[#P ( \"PluginName\" )  // The name of the plugin]]>
</Calculation>
</Value>
<Repetition>
<Calculation>
<![CDATA[1]]>
</Calculation>
</Repetition>
<Name>$PluginName</Name>
</Step>
<Step enable=\"True\" id=\"141\" name=\"Set Variable\">
<Value>
<Calculation>
<![CDATA[#P ( \"VersionFunction\" )  // Function as string that gets version.]]>
</Calculation>
</Value>
<Repetition>
<Calculation>
<![CDATA[1]]>
</Calculation>
</Repetition>
<Name>$VersionFunction</Name>
</Step>
<Step enable=\"True\" id=\"141\" name=\"Set Variable\">
<Value>
<Calculation>
<![CDATA[#P ( \"MinimumVersion\" )]]>
</Calculation>
</Value>
<Repetition>
<Calculation>
<![CDATA[1]]>
</Calculation>
</Repetition>
<Name>$MinimumVersion</Name>
</Step>
<Step enable=\"True\" id=\"141\" name=\"Set Variable\">
<Value>
<Calculation>
<![CDATA[#P ( \"ShowPrompts\" )]]>
</Calculation>
</Value>
<Repetition>
<Calculation>
<![CDATA[1]]>
</Calculation>
</Repetition>
<Name>$ShowPrompts</Name>
</Step>
<Step enable=\"True\" id=\"141\" name=\"Set Variable\">
<Value>
<Calculation>
<![CDATA[#P ( \"SomethingNew\" )]]>
</Calculation>
</Value>
<Repetition>
<Calculation>
<![CDATA[1]]>
</Calculation>
</Repetition>
<Name>$SomethingNew</Name>
</Step>
</fmxmlsnippet>"
	
end someSetVarScriptStepXML




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







