-- DDR Script to Pasteable Script
-- version 2023-06-01, Daniel A. Shockley

(*
	Converts a script copied from the DDR into a script object that can be pasted into a FileMaker database.

	HISTORY: 
		2023-06-01 ( danshockley ): created.  
*)

property debugMode : false
property stripTagPairs : {{"<StepText>", "</StepText>"}, {"<DisplayCalculation>", "</DisplayCalculation>"}}

on run
	
	
	-- load the translator library:
	set transPath to (((((path to me as text) & "::") as alias) as string) & "fmObjectTranslator.applescript")
	set objTrans to run script (transPath as alias)
	(* If you need a self-contained script, copy the code from fmObjectTranslator into this script and use the following instead of the run script step above:
			set objTrans to fmObjectTranslator_Instantiate({})
		*)
	
	set ddrXML to get the clipboard as text
	
	-- SAMPLE TEST CODE:	set ddrXML to someSetVarXML()
	
	
	set newXML to ddrXML
	
	set newXML to replaceSimple({newXML, "<StepList>", ""})
	set newXML to replaceSimple({newXML, "</StepList>", ""})
	set newXML to replaceSimple({newXML, "<StepText/>", ""})
	
	set newXML to "<fmxmlsnippet type=\"FMObjectList\">" & return & newXML & return & "</fmxmlsnippet>"
	
	repeat with oneTagPair in stripTagPairs
		set startTag to item 1 of oneTagPair
		set endTag to item 2 of oneTagPair
		repeat while newXML contains startTag and newXML contains endTag
			set posStart to offset of startTag in newXML
			set posEnd to offset of endTag in newXML
			set textBefore to text 1 thru (posStart - 1) of newXML
			set textAfter to text (posEnd + (length of endTag)) thru (length of newXML) of newXML
			set newXML to textBefore & textAfter
		end repeat
	end repeat
	
	set the clipboard to newXML
	
	clipboardConvertToFMObjects({}) of objTrans
	
	
	return newXML
	
	
end run





on someSetVarXML()
	
	
	return "	<Script includeInMenu=\"False\" runFullAccess=\"False\" id=\"112\" name=\"TEMPLATE - Error-Handling Loop\">
		<StepList>
			<Step enable=\"True\" id=\"89\" name=\"# (comment)\">
				<StepText>#Description: 

	A template for an error-handling loop. 
</StepText>
				<Text>Description: 

	A template for an error-handling loop. 
</Text>
			</Step>
			<Step enable=\"True\" id=\"89\" name=\"# (comment)\">
				<StepText>#HISTORY: 

	2023-01-05 ( danshock ): Basic template. Could be more involved, especially around handling errors from sub-scripts. 
</StepText>
				<Text>HISTORY: 

	2023-01-05 ( danshock ): Basic template. Could be more involved, especially around handling errors from sub-scripts. 
</Text>
			</Step>
			<Step enable=\"True\" id=\"89\" name=\"# (comment)\">
				<StepText/>
			</Step>
			<Step enable=\"True\" id=\"71\" name=\"Loop\">
				<StepText>Loop</StepText>
			</Step>
			<Step enable=\"True\" id=\"89\" name=\"# (comment)\">
				<StepText>#BEGIN: Error-Handling LOOP:</StepText>
				<Text>BEGIN: Error-Handling LOOP:</Text>
			</Step>
			<Step enable=\"True\" id=\"89\" name=\"# (comment)\">
				<StepText/>
			</Step>
			<Step enable=\"False\" id=\"75\" name=\"Commit Records/Requests\">
				<StepText>//  Commit Records/Requests</StepText>
				<NoInteract state=\"False\"/>
				<Option state=\"False\"/>
				<ESSForceCommit state=\"False\"/>
			</Step>
			<Step enable=\"False\" id=\"72\" name=\"Exit Loop If\">
				<StepText>//  Exit Loop If [ Let ( [ 
	  $errNum = Get ( LastError ) 
	; $errStep = &quot;Committing record&quot; 
]; 
	$errNum ­ 0 
) ]</StepText>
				<Calculation><![CDATA[Let ( [ 
	  $errNum = Get ( LastError ) 
	; $errStep = \"Committing record\" 
]; 
	$errNum ­ 0 
)]]></Calculation>
				<DisplayCalculation>
					<Chunk type=\"FunctionRef\">Let</Chunk>
					<Chunk type=\"NoRef\"> ( [ 
	  $errNum = </Chunk>
					<Chunk type=\"FunctionRef\">Get</Chunk>
					<Chunk type=\"NoRef\"> ( </Chunk>
					<Chunk type=\"FunctionRef\">LastError</Chunk>
					<Chunk type=\"NoRef\"> ) 
	; $errStep = &quot;Committing record&quot; 
]; 
	$errNum ­ 0 
)</Chunk>
				</DisplayCalculation>
			</Step>
			<Step enable=\"True\" id=\"89\" name=\"# (comment)\">
				<StepText/>
			</Step>
			<Step enable=\"True\" id=\"72\" name=\"Exit Loop If\">
				<StepText>Exit Loop If [ True /* ALWAYS EXIT error-handling loop after one pass!! */ ]</StepText>
				<Calculation><![CDATA[True /* ALWAYS EXIT error-handling loop after one pass!! */]]></Calculation>
				<DisplayCalculation>
					<Chunk type=\"FunctionRef\">True</Chunk>
					<Chunk type=\"NoRef\"> /* ALWAYS EXIT error-handling loop after one pass!! */</Chunk>
				</DisplayCalculation>
			</Step>
			<Step enable=\"True\" id=\"89\" name=\"# (comment)\">
				<StepText>#END OF: Error-Handling LOOP.</StepText>
				<Text>END OF: Error-Handling LOOP.</Text>
			</Step>
			<Step enable=\"True\" id=\"73\" name=\"End Loop\">
				<StepText>End Loop</StepText>
			</Step>
			<Step enable=\"True\" id=\"89\" name=\"# (comment)\">
				<StepText/>
			</Step>
			<Step enable=\"True\" id=\"68\" name=\"If\">
				<StepText>If [ not IsEmpty ( $errNum ) and $errNum ­ 0 ]</StepText>
				<Calculation><![CDATA[not IsEmpty ( $errNum ) and $errNum ­ 0]]></Calculation>
				<DisplayCalculation>
					<Chunk type=\"FunctionRef\">not</Chunk>
					<Chunk type=\"NoRef\"> </Chunk>
					<Chunk type=\"FunctionRef\">IsEmpty</Chunk>
					<Chunk type=\"NoRef\"> ( $errNum ) </Chunk>
					<Chunk type=\"FunctionRef\">and</Chunk>
					<Chunk type=\"NoRef\"> $errNum ­ 0</Chunk>
				</DisplayCalculation>
			</Step>
			<Step enable=\"True\" id=\"70\" name=\"End If\">
				<StepText>End If</StepText>
			</Step>
			<Step enable=\"True\" id=\"89\" name=\"# (comment)\">
				<StepText/>
			</Step>
		</StepList>
	</Script>"
	
end someSetVarXML







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


