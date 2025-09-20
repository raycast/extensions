-- Escape text for use as FM Calc
-- version 1.4, Daniel A. Shockley

(*
	Takes some block of text and escapes it so that, if you paste the result into a FileMaker calculation box and then evaluate that calculation, the original text is returned. Note that this attempts to wrap field references with a  GetFieldName call so that the calculation would survive a field or table being renamed. 
	
	
HISTORY: 
	1.4 - 2021-01-11 ( danshock ): Instead of the makeEscapedMoreLegible flag (was disabled by default) doing something that breaks fidelity after double-conversion, it instead breaks the output into concatenated FileMaker strings, which improves legibility and yet still, when evaluated back into the original, now retains full fidelity, producing the original text. So, that flag is now the DEFAULT action. Please go to https://github.com/DanShockley/FmClipTools to report any issues with this change. 
	1.3 - 2019-03-12 ( dshockley ): Renamed as "Escape text for use as FM Calc" instead of "Clipboard TEXT to FM Calc". Moved raw character strings into properties and used the ASCII number instead. 
	1.2 - ????-??-?? ( dshockley ): First created. Date unknown. 

*)


property pilcrow : ASCII character 166
property backslash : ASCII character 92
property escapedBackslash : ("" & backslash & backslash) as string
property doubleQuote : ASCII character 34
property escapedDoubleQuote : ("" & backslash & doubleQuote) as string

property makeEscapedMoreLegible : true (* Creates concatenated strings on separate lines for the output, greatly improving legibility. *)

on run
	
	if makeEscapedMoreLegible then
		set UUID to do shell script "uuidgen"
		set carriageReturnReplacedBy to UUID
	else
		set carriageReturnReplacedBy to pilcrow
	end if
	
	set whitespaceList to {space, ASCII character 10, ASCII character 13, tab, pilcrow}
	set replaceListAStoFM to {{ASCII character 13, carriageReturnReplacedBy} Â
		, {backslash, escapedBackslash}, {doubleQuote, escapedDoubleQuote}}
	
	set textAsCalc to the clipboard
	
	set fmCalc to textAsCalc
	repeat with oneReplace in replaceListAStoFM
		set oneReplace to contents of oneReplace
		set fmCalc to replaceSimple({fmCalc, item 1 of oneReplace, item 2 of oneReplace})
	end repeat
	
	set fmCalc to ("" & doubleQuote & fmCalc & doubleQuote) as string
	
	if makeEscapedMoreLegible then
		set fmCalc to replaceSimple({sourceTEXT:fmCalc, oldChars:UUID, newChars:"" & pilcrow & doubleQuote & (ASCII character 13) & "& " & doubleQuote})
	end if
	
	set parseForFieldRefs to parseChars({fmCalc, "::"})
	
	
	if (count of parseForFieldRefs) is greater than 1 then
		-- we have at least one field ref, so we need to wrap with GetFieldName
		set fmCalc to ""
		repeat with indexChunk from 1 to count of parseForFieldRefs
			set oneChunk to item indexChunk of parseForFieldRefs
			
			if indexChunk is greater than 1 then
				set oldDelims to AppleScript's text item delimiters
				set AppleScript's text item delimiters to whitespaceList
				set parsedByWhitespace to text items of oneChunk
				set AppleScript's text item delimiters to oldDelims
				
				set startString to first item of parsedByWhitespace
				set offsetStartString to (length of startString) + 1
				set oneChunk to startString & " ) & " & doubleQuote & text offsetStartString thru (length of oneChunk) of oneChunk
				
			end if
			
			
			if indexChunk is less than (count of parseForFieldRefs) then
				set oldDelims to AppleScript's text item delimiters
				set AppleScript's text item delimiters to whitespaceList
				set parsedByWhitespace to text items of oneChunk
				set AppleScript's text item delimiters to oldDelims
				
				set finalString to last item of parsedByWhitespace
				set offsetFinalString to -1 - (length of finalString)
				set oneChunk to text 1 thru offsetFinalString of oneChunk & doubleQuote & " & GetFieldName ( " & finalString
				
				
			end if
			
			
			if length of fmCalc is 0 then
				set fmCalc to oneChunk
			else
				set fmCalc to fmCalc & "::" & oneChunk
			end if
			
			
			
		end repeat
		
	end if
	
	set the clipboard to fmCalc
	return "TESTING DEBUGGING"
	
	
	set the clipboard to fmCalc
	
end run




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


on parseChars(prefs)
	-- version 1.3
	
	set defaultPrefs to {considerCase:true}
	
	
	if class of prefs is list then
		if (count of prefs) is greater than 2 then
			-- get any parameters after the initial 3
			set prefs to {sourceTEXT:item 1 of prefs, parseString:item 2 of prefs, considerCase:item 3 of prefs}
		else
			set prefs to {sourceTEXT:item 1 of prefs, parseString:item 2 of prefs}
		end if
		
	else if class of prefs is not equal to (class of {someKey:3}) then
		-- Test by matching class to something that IS a record to avoid FileMaker namespace conflict with the term "record"
		
		error "The parameter for 'parseChars()' should be a record or at least a list. Wrap the parameter(s) in curly brackets for easy upgrade to 'parseChars() version 1.3. " number 1024
		
	end if
	
	
	set prefs to prefs & defaultPrefs
	
	
	set sourceTEXT to sourceTEXT of prefs
	set parseString to parseString of prefs
	set considerCase to considerCase of prefs
	
	
	set oldDelims to AppleScript's text item delimiters
	try
		set AppleScript's text item delimiters to the {parseString as string}
		
		if considerCase then
			considering case
				set the parsedList to every text item of sourceTEXT
			end considering
		else
			ignoring case
				set the parsedList to every text item of sourceTEXT
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
