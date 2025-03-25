#@osa-lang:AppleScript
use framework "SoundAnalysis"

property confidenceThreshold : 0.6 -- Level of confidence necessary for classification to appear in result
property theResult : "" -- Sequence of sound classification labels throughout the sound file's duration

-- Analyze sound file for classifiable sounds
on analyzeSound(filePath)
	global theResult

	-- Initialize sound analyzer with file
	set theURL to current application's NSURL's fileURLWithPath:filePath
	set theAnalyzer to current application's SNAudioFileAnalyzer's alloc()'s initWithURL:theURL |error|:(missing value)

	-- Initial sound classification request and add it to the analyzer
	set theRequest to current application's SNClassifySoundRequest's alloc()'s initWithClassifierIdentifier:(current application's SNClassifierIdentifierVersion1) |error|:(missing value)
	theAnalyzer's addRequest:(theRequest) withObserver:(me) |error|:(missing value)

	-- Start the analysis and wait for it to complete
	theAnalyzer's analyze()
	repeat while theResult is ""
		delay 0.1
	end repeat
	return theResult
end analyzeSound

-- Act on classification result
on request:request didProduceResult:|result|
	global confidenceThreshold
	global theResult

	-- Add classification labels whose confidence meets the threshold
	set theClassifications to |result|'s classifications()
	set i to 1
	repeat while length of theResult < 1000 and i < (count of theClassifications)
		set classification to item i of theClassifications
		if classification's confidence() > confidenceThreshold then
			set theResult to theResult & (classification's identifier() as text) & " "
		end if
		set i to i + 1
	end repeat
end request:didProduceResult:

-- Set the result if an error occurs to avoid infinite loop
on request:request didFailWithError:|error|
	global theResult
	if theResult is "" then
		set theResult to " "
	end if
end request:didFailWithError:

-- Set the result if request completes without classifications being made to avoid infinite loop
on requestDidComplete:request
	global theResult
	if theResult is "" then
		set theResult to " "
	end if
end requestDidComplete:

on run (argv)
	return analyzeSound(item 3 of argv)
end run