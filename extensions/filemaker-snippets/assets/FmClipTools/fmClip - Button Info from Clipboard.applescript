-- Button Info from Clipboard
-- version 1.0

(*
	Takes the button object(s) in the clipboard and extracts the label, the script name, and the parameters as tab-column-delimiter and linefeed-row-delimiter
	
HISTORY:
	1.0 - 2021-10-21 ( dshockley ): first created.

*)


property debugMode : false
property colSep : tab
property rowSep : ASCII character 10
property CR : ASCII character 13

-- for generic layout objects:
property earlyCharScanLengthMax : 400 -- only scan through this number of chars when looking for fmxmlsnippet
property xmlLayoutObjectList : "<fmxmlsnippet type=\"LayoutObjectList\">"


on run
	
	-- INITIALIZE VARS:
	set isLayoutObjects to false
	set doButtonBarSegments to false
	
	
	set objTrans to run script alias (((((path to me as text) & "::") as alias) as string) & "fmObjectTranslator.applescript")
	(* If you need a self-contained script, copy the code from fmObjectTranslator into this script and use the following instead of the run script step above:
			set objTrans to fmObjectTranslator_Instantiate({})
	*)
	
	-- init Translator properties:
	set shouldPrettify of objTrans to false
	set debugMode of objTrans to debugMode
	
	
	---------------------------------
	-- Look at clipboard and ask possible initial questions about it:
	
	set clipboardType to checkClipboardForObjects({}) of objTrans
	
	if clipboardType is false then
		display dialog "The clipboard did not contain any FileMaker objects."
		return false
	end if
	
	set clipboardObjectStringXML to clipboardGetObjectsAsXML({}) of objTrans
	
	-- scan early characters of XML to see if it is layout objects: 
	if length of clipboardObjectStringXML is less than earlyCharScanLengthMax then set earlyCharScanLengthMax to length of clipboardObjectStringXML
	if ((text 1 thru earlyCharScanLengthMax of clipboardObjectStringXML) contains xmlLayoutObjectList) and not doButtonBarSegments then
		-- These are Layout Objects (and either are not button bar segments, or user chose to handle segments like normal layout objects), so need special handling:
		set isLayoutObjects to true
	end if
	
	
	
	if not isLayoutObjects then
		-- THROW AN ERROR
		display dialog "Not layout objects"
		
	else
		
		set outputInfo to ""
		
		tell application "System Events"
			set xmlData to make new XML data with data clipboardObjectStringXML
			set layoutObject to XML element 1 of XML element 1 of xmlData
			
			repeat with oneElement in XML elements of layoutObject
				if name of oneElement is "Object" and value of XML attribute "type" of oneElement is "Button" then
					tell oneElement
						set labelText to value of XML element "Data" of XML element "Style" of XML element "ParagraphStyleVector" of XML element "TextObj"
						set scriptName to value of XML attribute "name" of XML element "Script" of XML element "Step" of XML element "ButtonObj"
						try
							set scriptParams to value of XML element "Calculation" of XML element "Step" of XML element "ButtonObj"
						on error
							set scriptParams to ""
						end try
						
					end tell
					
					-- for now, convert internal line endings into spaces and put tabs between pieces: 
					set output_Label to my replaceSimple({my replaceSimple({my replaceSimple({labelText, CR, space}), rowSep, space}), colSep, space})
					set output_ScriptName to my replaceSimple({my replaceSimple({my replaceSimple({scriptName, CR, space}), rowSep, space}), colSep, space})
					set output_Params to my replaceSimple({my replaceSimple({my replaceSimple({scriptParams, CR, space}), rowSep, space}), colSep, space})
					
					set oneButtonInfo to output_Label & colSep & output_ScriptName & colSep & output_Params
					
					if length of outputInfo is greater than 0 then
						set outputInfo to outputInfo & rowSep & oneButtonInfo
					else
						set outputInfo to oneButtonInfo
					end if
				end if
			end repeat
			
		end tell
		
	end if
	
	
	---------------------------------
	-- ADD the new text into the clipboard:
	set fmClipboard to get the clipboard
	set newClip to {string:outputInfo} & fmClipboard
	
	set the clipboard to newClip
	
	
	return outputInfo
	
	
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