-- Loop Script Steps
-- version 2021-10-06, Daniel A. Shockley

(* 

	Puts FileMaker script steps into clipboard that loop over a return-delimited value list or the found set of records.

HISTORY:
	2021-10-06 ( dshockley ): Add small pause/refresh to the record loop. 
	2020-07-29 ( dshockley ): Improved the dialog messages. 
	2020-04-22 ( dshockley ): BUG-FIX - XML had extra $ character before ListName placeholder. 
	2020-04-16 ( dshockley ): First created, but replacing code used in an old macro. 

*)

property ScriptName : "LoopScriptSteps"
property debugMode : false

on run
	
	
	set objTrans to run script alias (((((path to me as text) & "::") as alias) as string) & "fmObjectTranslator.applescript")
	(* If you need a self-contained script, copy the code from fmObjectTranslator into this script and use the following instead of the run script step above:
			set objTrans to fmObjectTranslator_Instantiate({})
	*)
	
	
	-- IMPORTANT!!!  	-- IMPORTANT!!!  	-- IMPORTANT!!!  
	-- IMPORTANT!!!  	-- IMPORTANT!!!  	-- IMPORTANT!!!  
	-- The search/replace needs to be able to assume extra whitespace wasn't added.
	-- IMPORTANT!!!  	-- IMPORTANT!!!  	-- IMPORTANT!!!  
	set shouldPrettify of objTrans to false
	-- IMPORTANT!!!  	-- IMPORTANT!!!  	-- IMPORTANT!!!  
	-- IMPORTANT!!!  	-- IMPORTANT!!!  	-- IMPORTANT!!!  
	
	set objPrompt to (display dialog "If you want to loop over a return-delimited list of values, enter a name for a single item (e.g. ID for a list of IDs, so this script will make that into $oneID variable). Or, just choose Records instead:" buttons {"Cancel", "Records", "List"} default button "List" default answer "")
	set objName to text returned of objPrompt
	set objType to button returned of objPrompt
	
	
	if objType is equal to "Cancel" then
		return false
	else if objType is equal to "Records" then
		
		set stepsXML to stringXML_RecordLoop()
		if length of objName is 0 then set objName to "Rec"
		set stepsXML to objTrans's replaceSimple({stepsXML, "###Obj###", objName})
		set stepsXML to objTrans's replaceSimple({stepsXML, "###ListName###", "RemoveThisStep"})
		
	else if objType is equal to "List" then
		
		set stepsXML to stringXML_ValueLoop()
		if length of objName is 0 then set objName to "Value"
		set stepsXML to objTrans's replaceSimple({stepsXML, "###Obj###", objName})
		
		set ListPrompt to (display dialog "Enter the name of the variable that is being looped over (e.g. $myIDs_list):" buttons {"Cancel", "OK"} default button "OK" default answer ("$my" & objName & "s_list") as string)
		set ListName to text returned of ListPrompt
		if length of ListName is 0 then
			set ListName to "$someValueList"
		else if ListName does not start with "$" then
			set ListName to ("$" & ListName) as string
		end if
		set stepsXML to objTrans's replaceSimple({stepsXML, "###ListName###", ListName})
	end if
	
	
	set the clipboard to stepsXML
	
	clipboardConvertToFMObjects({}) of objTrans
	
	
	return stepsXML
	
end run








on stringXML_RecordLoop()
	-- 2020-04-16 ( dshockley )
	
	return "<fmxmlsnippet type=\"FMObjectList\">
	<Step enable=\"True\" id=\"141\" name=\"Set Variable\">
		<Value>
			<Calculation><![CDATA[0]]></Calculation>
		</Value>
		<Repetition>
			<Calculation><![CDATA[1]]></Calculation>
		</Repetition>
		<Name>$iter_###Obj###_num</Name>
	</Step>
	<Step enable=\"True\" id=\"141\" name=\"Set Variable\">
		<Value>
			<Calculation><![CDATA[Get ( FoundCount )]]></Calculation>
		</Value>
		<Repetition>
			<Calculation><![CDATA[1]]></Calculation>
		</Repetition>
		<Name>$iter_###Obj###_exit</Name>
	</Step>
	<Step enable=\"True\" id=\"71\" name=\"Loop\"></Step>
	<Step enable=\"True\" id=\"72\" name=\"Exit Loop If\">
		<Calculation><![CDATA[Let ( $iter_###Obj###_num = $iter_###Obj###_num + 1 ; $iter_###Obj###_num > $iter_###Obj###_exit )]]></Calculation>
	</Step>
	<Step enable=\"True\" id=\"16\" name=\"Go to Record/Request/Page\">
		<NoInteract state=\"True\"></NoInteract>
		<RowPageLocation value=\"ByCalculation\"></RowPageLocation>
		<Calculation><![CDATA[$iter_###Obj###_num]]></Calculation>
	</Step>
	<Step enable=\"True\" id=\"68\" name=\"If\">
		<Calculation><![CDATA[Mod ( $iter_###Obj###_num ; 20 ) = 0 or $iter_###Obj###_num = 1 or $iter_###Obj###_num = $iter_###Obj###_exit]]></Calculation>
	</Step>
	<Step enable=\"True\" id=\"68\" name=\"If\">
		<Calculation><![CDATA[not PlatformIsServer]]></Calculation>
	</Step>
	<Step enable=\"True\" id=\"80\" name=\"Refresh Window\">
		<Option state=\"False\"></Option>
		<FlushSQLData state=\"False\"></FlushSQLData>
	</Step>
	<Step enable=\"True\" id=\"62\" name=\"Pause/Resume Script\">
		<PauseTime value=\"ForDuration\"></PauseTime>
		<Calculation><![CDATA[1/100]]></Calculation>
	</Step>
	<Step enable=\"True\" id=\"79\" name=\"Freeze Window\"></Step>
	<Step enable=\"True\" id=\"70\" name=\"End If\"></Step>
	<Step enable=\"True\" id=\"70\" name=\"End If\"></Step>
	<Step enable=\"True\" id=\"89\" name=\"Comment\"></Step>
	<Step enable=\"True\" id=\"89\" name=\"Comment\"></Step>
	<Step enable=\"True\" id=\"73\" name=\"End Loop\"></Step>
</fmxmlsnippet>"
	
end stringXML_RecordLoop


on stringXML_ValueLoop()
	-- 2020-04-16 ( dshockley )
	
	return "<fmxmlsnippet type=\"FMObjectList\">
	<Step enable=\"True\" id=\"141\" name=\"Set Variable\">
		<Value>
			<Calculation><![CDATA[0]]></Calculation>
		</Value>
		<Repetition>
			<Calculation><![CDATA[1]]></Calculation>
		</Repetition>
		<Name>$iter_###Obj###_num</Name>
	</Step>
	<Step enable=\"True\" id=\"141\" name=\"Set Variable\">
		<Value>
			<Calculation><![CDATA[ValueCount ( ###ListName### )]]></Calculation>
		</Value>
		<Repetition>
			<Calculation><![CDATA[1]]></Calculation>
		</Repetition>
		<Name>$iter_###Obj###_exit</Name>
	</Step>
	<Step enable=\"True\" id=\"71\" name=\"Loop\"></Step>
	<Step enable=\"True\" id=\"72\" name=\"Exit Loop If\">
		<Calculation><![CDATA[Let ( $iter_###Obj###_num = $iter_###Obj###_num + 1 ; $iter_###Obj###_num > $iter_###Obj###_exit )]]></Calculation>
	</Step>
	<Step enable=\"True\" id=\"141\" name=\"Set Variable\">
		<Value>
			<Calculation><![CDATA[GetValue ( ###ListName### ; $iter_###Obj###_num )]]></Calculation>
		</Value>
		<Repetition>
			<Calculation><![CDATA[1]]></Calculation>
		</Repetition>
		<Name>$one###Obj###</Name>
	</Step>
	<Step enable=\"True\" id=\"89\" name=\"Comment\"></Step>
	<Step enable=\"True\" id=\"89\" name=\"Comment\"></Step>
	<Step enable=\"True\" id=\"73\" name=\"End Loop\"></Step>
</fmxmlsnippet>"
	
end stringXML_ValueLoop








on getTextBetweenChoice(prefs)
	-- version 1.6
	-- gets the text between specified occurrence of beforeText and afterText in sourceText
	-- the default textItemNum should be 1, NOT 2
	set defaultPrefs to {textItemNum:1}
	
	if (class of prefs is not list) and (class of prefs is not record) then
		error "getTextBetween FAILED: parameter should be a record or list. If it is multiple items, just make it into a list to upgrade to this handler." number 1024
	end if
	if class of prefs is list then
		if (count of prefs) is 4 then
			set textItemNum of defaultPrefs to item 4 of prefs
		end if
		set prefs to {sourceText:item 1 of prefs, beforeText:item 2 of prefs, afterText:item 3 of prefs}
	end if
	set prefs to prefs & defaultPrefs -- add on default preferences, if needed
	
	set sourceText to sourceText of prefs
	set beforeText to beforeText of prefs
	set afterText to afterText of prefs
	set textItemNum to textItemNum of prefs
	try
		set oldDelims to AppleScript's text item delimiters
		set AppleScript's text item delimiters to the beforeText
		set the prefixRemoved to text item (textItemNum + 1) of sourceText
		
		set AppleScript's text item delimiters to afterText
		set the finalResult to text item 1 of prefixRemoved
		
		set AppleScript's text item delimiters to oldDelims
		
	on error errMsg number errNum
		set AppleScript's text item delimiters to oldDelims
		-- 	tell me to log "Error in getTextBetween() : " & errMsg
		set the finalResult to "" -- return nothing if the surrounding text is not found
	end try
	
	return finalResult
	
end getTextBetweenChoice




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
	on error errMsg number errNum
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
	on error errMsg number errNum
		set AppleScript's text item delimiters to oldDelims
		return "" -- return nothing if the stop text is not found
	end try
end getTextBefore






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







