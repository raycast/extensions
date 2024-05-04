-- fmClip - Prettify XML in Clipboard
-- version 2023-03-10, Daniel A. Shockley

(*  
	Formats (prettifies) ANY XML (not just XML that represents FM Objects) in the clipboard. 

HISTORY:
	2023-03-10 ( danshockley ): first created. 
*)


on run
	
	set objTrans to run script alias (((((path to me as text) & "::") as alias) as string) & "fmObjectTranslator.applescript")
	(* If you need a self-contained script, copy the code from fmObjectTranslator into this script and use the following instead of the run script step above:
			set objTrans to fmObjectTranslator_Instantiate({})
	*)
	
	set debugMode of objTrans to true -- ONLY enable this while developing/testing
	
	try
		set originalClipInfo to (clipboard info)
		
		set someString to get the clipboard as string
		set isXML to isStringAnyValidXML(someString) of objTrans
		if not isXML then
			display dialog "The clipboard did not contain valid XML of any kind."
			return false
		end if
		
		set prettyXML to prettifyXML(someString) of objTrans
		
		
		set newClip to {string:prettyXML}
		
		-- Note that in this loop, we are supposedly putting BACK the other "text" objects.
		-- But, it seems that _starting_ with the new string object means it ignores the rest.
		repeat with oneClipObj in originalClipInfo
			set oneObjType to contents of item 1 of oneClipObj
			set oldObj to (get the clipboard as oneObjType)
			set newClip to newClip & recordFromList({oneObjType, oldObj})
		end repeat
		
		set the clipboard to newClip
		return true
		
	on error errMsg number errNum
		if errNum is -1700 then
			-- is not something that can be treated as text, so cannot have XML:
			return false
		else
			error errMsg number errNum
		end if
	end try
	
end run


on recordFromList(assocList)
	-- version 2003-11-06, Nigel Garvey, AppleScript-Users mailing list
	-- 2023-03-10 ( danshock ): tweaked to remove the "return msg" line that happened_before_ the run script (?).
	try
		{«class usrf»:assocList}'s x
	on error msg
		run script text 16 thru -2 of msg
	end try
end recordFromList














