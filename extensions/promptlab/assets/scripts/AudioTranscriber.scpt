#@osa-lang:AppleScript
use framework "Speech"

property maxCharacters : 3000
property tempResult : ""
property theResult : ""

-- Analyze sound file for classifiable sounds
on analyzeSpeech(filePath)
	global theResult

	set theURL to current application's NSURL's fileURLWithPath:filePath
	set theRecognizer to current application's SFSpeechRecognizer's alloc()'s init()
	set theRequest to current application's SFSpeechURLRecognitionRequest's alloc()'s initWithURL:theURL
	set theTask to theRecognizer's recognitionTaskWithRequest:(theRequest) delegate:(me)

	repeat while theTask's state() is current application's SFSpeechRecognitionTaskStateStarting or theTask's state() is current application's SFSpeechRecognitionTaskStateRunning
		delay 0.1
	end repeat
	return theResult
end analyzeSpeech

-- Act on classification result
on speechRecognitionTask:task didHypothesizeTranscription:transcription
	global maxCharacters
	global tempResult
	global theResult

	set tempResult to transcription's formattedString() as text
	if length of tempResult > maxCharacters then
		set theResult to tempResult
		task's cancel()
	end if
end speechRecognitionTask:didHypothesizeTranscription:

-- Set the result if an error occurs to avoid infinite loop
on speechRecognitionTask:task didFinishRecognition:|result|
	global theResult
	if theResult is "" then set theResult to |result|'s bestTranscription()'s formattedString() as text
end speechRecognitionTask:didFinishRecognition:

on run (argv)
	set maxCharacters to item 4 of argv
	set tempResult to ""
	set theResult to ""
	return analyzeSpeech(item 3 of argv)
end run