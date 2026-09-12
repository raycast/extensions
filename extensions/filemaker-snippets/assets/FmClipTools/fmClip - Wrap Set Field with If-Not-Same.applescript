-- Set Fields IF not same
-- version 4.1, Daniel A. Shockley, Erik Shagdar

(* 
	Takes Set Field script step objects in clipboard and puts back into clipboard those same steps wrapped in IF step that compares. USe this to avoid setting a field to a value it already has, so you can avoid making unnecessary modification metadata changes. 

HISTORY:
	4.1 - 2023-05-24 ( danshockley ): Added getFmAppProc to avoid being tied to one specific "FileMaker" app name. 
	4.0.1 - 2018-10-29 ( dshockley ): Made change recommended by https://github.com/jwillinghalpern - modified nameThruEndStep to by less specific so that any alternate XML tags between Step and /Field tags will not interrupt parsing. TODO: A better fix would be to re-work the whole thing to parse XML properly, but that is a longer-term project. 
	4.0 - 2018-04-04 ( dshockley/eshagdar ): load fmObjectTranslator code by reference instead of embedded.
	3.9.3 - 2017-08-09 ( eshagdar ): renamed 'Set Fields IF not same' to 'fmClip - Wrap Set Field with If-Not-Same' to match other handler name pattern
	3.9.2 - use 'Not Exact' comparison instead of the inequality operator.
	3.9.1 - updated fmObjectTranslator code
	1.1 - if the Set To was empty string (NULL, ""), then check for Not IsEmpty instead of simplistic comparison.
	1.0 - initial version
*)

property ScriptName : "SetFieldsIfNotSame"
property debugMode : false


-- PARSING CLIPS: 
property stepStart : "<Step enable=\"True\" id=\""
property stepSetFieldStart : "<Step enable=\"True\" id=\"76\" name=\"Set Field\"><Calculation><![CDATA["
property cdataThruTable : "]]></Calculation><Field table=\""
property tableThruId : "\" id=\""
property idThruName : "\" name=\""
property nameThruEndStep : "\">"

property finalXML : "</fmxmlsnippet>"



on run
	
	
	set objTrans to run script alias (((((path to me as text) & "::") as alias) as string) & "fmObjectTranslator.applescript")
	(* If you need a self-contained script, copy the code from fmObjectTranslator into this script and use the following instead of the run script step above:
			set objTrans to fmObjectTranslator_Instantiate({})
	*)
	
	
	
	-- IMPORTANT!!!  	-- IMPORTANT!!!  	-- IMPORTANT!!!  
	-- The search/replace needs to be able to assume extra whitespace wasn't added.
	set shouldPrettify of objTrans to false
	-- IMPORTANT!!!  	-- IMPORTANT!!!  	-- IMPORTANT!!!  
	
	-- Set Variable Script Step XML:
	set startingXML to clipboardGetObjectsAsXML({}) of objTrans
	-- DEBUG: set startingXML to sampleXML()
	
	
	tell objTrans to set scriptStepsWithoutStart to parseChars({startingXML, stepStart})
	
	
	if debugMode then logConsole(ScriptName, "TEST") of objTrans
	
	set newListOFXML to {}
	set addFinalXML to false
	
	set countSetFieldSteps to 0
	repeat with i from 1 to count of scriptStepsWithoutStart
		if i is equal to 1 then
			set oneScriptStep to item i of scriptStepsWithoutStart
			copy oneScriptStep to end of newListOFXML
			
			if debugMode then logConsole(ScriptName, i & ": " & oneScriptStep) of objTrans
			
		else
			
			set oneScriptStep to stepStart & item i of scriptStepsWithoutStart
			
			
			if debugMode then logConsole(ScriptName, i & ": " & oneScriptStep) of objTrans
			
			if oneScriptStep ends with finalXML then
				-- handle the closing XML tag for the whole thing.
				set oneScriptStep to getTextBefore(oneScriptStep, finalXML)
				set addFinalXML to true
			end if
			
			
			
			if oneScriptStep begins with stepSetFieldStart then
				-- this is a SET FIELD step, so add IF/END IF before/after:
				
				set countSetFieldSteps to countSetFieldSteps + 1
				
				set setFieldToThisCalc to my getTextBetweenChoice({oneScriptStep, stepSetFieldStart, cdataThruTable})
				
				set tableFieldPart to my getTextBetweenChoice({oneScriptStep, cdataThruTable, nameThruEndStep})
				set tableName to my getTextBefore(tableFieldPart, tableThruId)
				set fieldName to my getTextAfter(tableFieldPart, idThruName)
				
				if setFieldToThisCalc is "\"\"" or setFieldToThisCalc is "NULL" then
					-- if clearing the field, then use "Not IsEmpty" in the IF step, instead of not-equals comparison operator:
					set testCalc to "Not IsEmpty ( " & tableName & "::" & fieldName & " )"
				else
					set testCalc to "Not Exact ( " & tableName & "::" & fieldName & " ; " & setFieldToThisCalc & " )"
				end if
				
				set step_IF to makeStep_IF(testCalc)
				
				copy step_IF to end of newListOFXML
				copy oneScriptStep to end of newListOFXML
				copy makeStep_EndIF() to end of newListOFXML
				
				if addFinalXML then
					-- handle the closing XML tag for the whole thing.
					copy finalXML to end of newListOFXML
				end if
				
				
			else -- some OTHER kind of script step:
				copy oneScriptStep to end of newListOFXML
			end if
			
			
		end if
	end repeat
	
	
	set newXML to unParseChars(newListOFXML, return)
	
	
	set the clipboard to newXML
	
	
	set clipHasXML to checkClipboardForValidXML({}) of objTrans
	
	
	clipboardConvertToFMObjects({}) of objTrans
	
	tell application "System Events"
		set fmAppProc to my getFmAppProc()
		set frontmost of fmAppProc to true
		tell fmAppProc
			display dialog "Converted " & countSetFieldSteps & " Set Field steps to be wrapped in IF-not-same test." buttons {"OK"} default button "OK"
		end tell
	end tell
	
	return newXML
	
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








on makeStep_IF(testCalcString)
	
	set templateStep to "<Step enable=\"True\" id=\"68\" name=\"If\"><Calculation><![CDATA[###TESTCALC###]]></Calculation></Step>"
	
	return replaceSimple({templateStep, "###TESTCALC###", testCalcString})
	
	
end makeStep_IF

on makeStep_EndIF()
	
	return "<Step enable=\"True\" id=\"70\" name=\"End If\"></Step>"
	
end makeStep_EndIF



on sampleXML()
	
	return "<fmxmlsnippet type=\"FMObjectList\"><Step enable=\"True\" id=\"76\" name=\"Set Field\"><Calculation><![CDATA[_ext_15A_ACTIVITY::a15A_RelatedActivityID1]]></Calculation><Field table=\"_ext_15A.AC_ACTIVITY_UpdateCreate\" id=\"124\" name=\"aAC_RelatedActivityID1\"></Field></Step><Step enable=\"True\" id=\"76\" name=\"Set Field\"><Calculation><![CDATA[_ext_15A_ACTIVITY::a15A_RelatedActivityID2]]></Calculation><Field table=\"_ext_15A.AC_ACTIVITY_UpdateCreate\" id=\"125\" name=\"aAC_RelatedActivityID2\"></Field></Step><Step enable=\"True\" id=\"76\" name=\"Set Field\"><Calculation><![CDATA[_ext_15A_ACTIVITY::a15A_SupportOfActivity_ActivityID]]></Calculation><Field table=\"_ext_15A.AC_ACTIVITY_UpdateCreate\" id=\"126\" name=\"aAC_SupportOfActivity_ActivityID\"></Field></Step>

<Step enable=\"True\" id=\"76\" name=\"Set Field\"><Calculation><![CDATA[_ext_15A_ACTIVITY::b15A_ActivityCategory]]></Calculation><Field table=\"_ext_15A.AC_ACTIVITY_UpdateCreate\" id=\"32769\" name=\"bAC_ActivityCategory\"></Field></Step>

<Step enable=\"True\" id=\"76\" name=\"Set Field\"><Calculation><![CDATA[_ext_15A_ACTIVITY::b15A_ActivityEndDt]]></Calculation><Field table=\"_ext_15A.AC_ACTIVITY_UpdateCreate\" id=\"32770\" name=\"bAC_ActivityEndDt\"></Field></Step>

<Step enable=\"True\" id=\"76\" name=\"Set Field\"><Calculation><![CDATA[_ext_15A_ACTIVITY::b15A_ActivityEndTm]]></Calculation><Field table=\"_ext_15A.AC_ACTIVITY_UpdateCreate\" id=\"32771\" name=\"bAC_ActivityEndTm\"></Field></Step>

<Step enable=\"True\" id=\"76\" name=\"Set Field\"><Calculation><![CDATA[_ext_15A_ACTIVITY::b15A_ActivityNm]]></Calculation><Field table=\"_ext_15A.AC_ACTIVITY_UpdateCreate\" id=\"32772\" name=\"bAC_ActivityNm\"></Field></Step>

<Step enable=\"True\" id=\"76\" name=\"Set Field\"><Calculation><![CDATA[_ext_15A_ACTIVITY::b15A_ActivityNt]]></Calculation><Field table=\"_ext_15A.AC_ACTIVITY_UpdateCreate\" id=\"32773\" name=\"bAC_ActivityNt\"></Field></Step>

<Step enable=\"True\" id=\"76\" name=\"Set Field\"><Calculation><![CDATA[_ext_15A_ACTIVITY::b15A_ActivityStage]]></Calculation><Field table=\"_ext_15A.AC_ACTIVITY_UpdateCreate\" id=\"32774\" name=\"bAC_ActivityStage\"></Field></Step>

<Step enable=\"True\" id=\"76\" name=\"Set Field\"><Calculation><![CDATA[_ext_15A_ACTIVITY::b15A_ActivityStatus]]></Calculation><Field table=\"_ext_15A.AC_ACTIVITY_UpdateCreate\" id=\"32775\" name=\"bAC_ActivityStatus\"></Field></Step>

<Step enable=\"True\" id=\"76\" name=\"Set Field\"><Calculation><![CDATA[_ext_15A_ACTIVITY::b15A_ActivityStrtDt]]></Calculation><Field table=\"_ext_15A.AC_ACTIVITY_UpdateCreate\" id=\"32776\" name=\"bAC_ActivityStrtDt\"></Field></Step>

<Step enable=\"True\" id=\"76\" name=\"Set Field\"><Calculation><![CDATA[_ext_15A_ACTIVITY::b15A_ActivityStrtTm]]></Calculation><Field table=\"_ext_15A.AC_ACTIVITY_UpdateCreate\" id=\"32777\" name=\"bAC_ActivityStrtTm\"></Field></Step>

<Step enable=\"True\" id=\"76\" name=\"Set Field\"><Calculation><![CDATA[_ext_15A_ACTIVITY::b15A_ActivityType]]></Calculation><Field table=\"_ext_15A.AC_ACTIVITY_UpdateCreate\" id=\"32778\" name=\"bAC_ActivityType\"></Field></Step>

<Step enable=\"True\" id=\"76\" name=\"Set Field\"><Calculation><![CDATA[_ext_15A_ACTIVITY::b15A_Adr]]></Calculation><Field table=\"_ext_15A.AC_ACTIVITY_UpdateCreate\" id=\"32779\" name=\"bAC_Adr\"></Field></Step>

<Step enable=\"True\" id=\"76\" name=\"Set Field\"><Calculation><![CDATA[_ext_15A_ACTIVITY::b15A_ConfirmationGoal]]></Calculation><Field table=\"_ext_15A.AC_ACTIVITY_UpdateCreate\" id=\"32788\" name=\"bAC_ConfirmationGoal\"></Field></Step>

<Step enable=\"True\" id=\"76\" name=\"Set Field\"><Calculation><![CDATA[_ext_15A_ACTIVITY::b15A_ConfirmGoalDouble]]></Calculation><Field table=\"_ext_15A.AC_ACTIVITY_UpdateCreate\" id=\"32789\" name=\"bAC_ConfirmGoalDouble\"></Field></Step>

<Step enable=\"True\" id=\"76\" name=\"Set Field\"><Calculation><![CDATA[_ext_15A_ACTIVITY::b15A_Desc]]></Calculation><Field table=\"_ext_15A.AC_ACTIVITY_UpdateCreate\" id=\"32790\" name=\"bAC_Desc\"></Field></Step>

<Step enable=\"True\" id=\"76\" name=\"Set Field\"><Calculation><![CDATA[_ext_15A_ACTIVITY::b15A_Local]]></Calculation><Field table=\"_ext_15A.AC_ACTIVITY_UpdateCreate\" id=\"32804\" name=\"bAC_Local\"></Field></Step>

<Step enable=\"True\" id=\"76\" name=\"Set Field\"><Calculation><![CDATA[_ext_15A_ACTIVITY::b15A_MapURL]]></Calculation><Field table=\"_ext_15A.AC_ACTIVITY_UpdateCreate\" id=\"32805\" name=\"bAC_MapURL\"></Field></Step>

<Step enable=\"True\" id=\"76\" name=\"Set Field\"><Calculation><![CDATA[_ext_15A_ACTIVITY::b15A_Political]]></Calculation><Field table=\"_ext_15A.AC_ACTIVITY_UpdateCreate\" id=\"32825\" name=\"bAC_Political\"></Field></Step>

<Step enable=\"True\" id=\"76\" name=\"Set Field\"><Calculation><![CDATA[_ext_15A_ACTIVITY::b15A_Question1]]></Calculation><Field table=\"_ext_15A.AC_ACTIVITY_UpdateCreate\" id=\"32858\" name=\"bAC_Question1\"></Field></Step>

<Step enable=\"True\" id=\"76\" name=\"Set Field\"><Calculation><![CDATA[_ext_15A_ACTIVITY::b15A_Question1_Label]]></Calculation><Field table=\"_ext_15A.AC_ACTIVITY_UpdateCreate\" id=\"32859\" name=\"bAC_Question1_Label\"></Field></Step>

<Step enable=\"True\" id=\"76\" name=\"Set Field\"><Calculation><![CDATA[_ext_15A_ACTIVITY::b15A_Question2]]></Calculation><Field table=\"_ext_15A.AC_ACTIVITY_UpdateCreate\" id=\"32860\" name=\"bAC_Question2\"></Field></Step>

<Step enable=\"True\" id=\"76\" name=\"Set Field\"><Calculation><![CDATA[_ext_15A_ACTIVITY::b15A_Question2_Label]]></Calculation><Field table=\"_ext_15A.AC_ACTIVITY_UpdateCreate\" id=\"32861\" name=\"bAC_Question2_Label\"></Field></Step>

<Step enable=\"True\" id=\"76\" name=\"Set Field\"><Calculation><![CDATA[_ext_15A_ACTIVITY::b15A_Question3]]></Calculation><Field table=\"_ext_15A.AC_ACTIVITY_UpdateCreate\" id=\"32862\" name=\"bAC_Question3\"></Field></Step>

<Step enable=\"True\" id=\"76\" name=\"Set Field\"><Calculation><![CDATA[_ext_15A_ACTIVITY::b15A_Question3_Label]]></Calculation><Field table=\"_ext_15A.AC_ACTIVITY_UpdateCreate\" id=\"32863\" name=\"bAC_Question3_Label\"></Field></Step></fmxmlsnippet>"
	
end sampleXML








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







