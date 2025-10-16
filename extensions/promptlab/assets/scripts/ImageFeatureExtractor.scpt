#@osa-lang:AppleScript
use framework "Vision"
use scripting additions

on trim(theText)
	set theString to current application's NSString's stringWithString:theText
	set spaces to current application's NSCharacterSet's whitespaceAndNewlineCharacterSet
	set trimmedString to theString's stringByTrimmingCharactersInSet:spaces
	return trimmedString as text
end trim

on run (argv)
	set imagePath to item 3 of argv
	set useSubjectClassification to item 4 of argv is "true"
	set useBarcodeDetection to item 5 of argv is "true"
	set useFaceDetection to item 6 of argv is "true"
	set useRectangleDetection to item 7 of argv is "true"
	set useSaliencyAnalysis to item 8 of argv is "true"
	set useHorizonDetection to item 9 of argv is "true"
	set confidenceThreshold to item 10 of argv as number
	set promptText to ""
	set imageData to current application's NSMutableDictionary's alloc()'s init()

	try
		set theImage to current application's NSImage's alloc()'s initWithContentsOfFile:imagePath

		set requestHandler to current application's VNImageRequestHandler's alloc()'s initWithData:(theImage's TIFFRepresentation()) options:(current application's NSDictionary's alloc()'s init())

		set textRequest to current application's VNRecognizeTextRequest's alloc()'s init()
		set classificationRequest to current application's VNClassifyImageRequest's alloc()'s init()
		set barcodeRequest to current application's VNDetectBarcodesRequest's alloc()'s init()
		set animalRequest to current application's VNRecognizeAnimalsRequest's alloc()'s init()
		set faceRequest to current application's VNDetectFaceRectanglesRequest's alloc()'s init()
		set rectRequest to current application's VNDetectRectanglesRequest's alloc()'s init()
		set saliencyRequest to current application's VNGenerateAttentionBasedSaliencyImageRequest's alloc()'s init()
		set horizonRequest to current application's VNDetectHorizonRequest's alloc()'s init()
		rectRequest's setMaximumObservations:0

		if theImage's |size|()'s width > 200 and theImage's |size|()'s height > 200 then
			requestHandler's performRequests:{textRequest, classificationRequest, barcodeRequest, animalRequest, faceRequest, rectRequest, saliencyRequest, horizonRequest} |error|:(missing value)
		else
			requestHandler's performRequests:{textRequest, classificationRequest, barcodeRequest, animalRequest, faceRequest, saliencyRequest, horizonRequest} |error|:(missing value)
		end if

		-- Extract raw text results
		set textResults to textRequest's results()
		set theText to ""
		repeat with observation in textResults
			set theText to theText & ((first item in (observation's topCandidates:1))'s |string|() as text) & ", "
		end repeat

		if useSubjectClassification then
			-- Extract subject classifications
			set classificationResults to classificationRequest's results()
			set classifications to {}
			repeat with observation in classificationResults
				if observation's confidence() > confidenceThreshold then
					copy observation's identifier() as text to end of classifications
				end if
			end repeat

			-- Extract animal detection results
			set animalResults to animalRequest's results()
			set theAnimals to ""
			repeat with observation in animalResults
				repeat with label in (observation's labels())
					set theAnimals to (theAnimals & label's identifier as text) & ", "
				end repeat
			end repeat

			if theAnimals is not "" then
				set theAnimals to text 1 thru -3 of theAnimals
			end if
		end if

		if useBarcodeDetection then
			-- Extract barcode text results
			set barcodeResults to barcodeRequest's results()
			set barcodeText to ""
			repeat with observation in barcodeResults
				set barcodeText to barcodeText & (observation's payloadStringValue() as text) & ", "
			end repeat

			if length of barcodeText > 0 then
				set barcodeText to text 1 thru ((length of barcodeText) - 2) of barcodeText
			end if
		end if

		if useFaceDetection then
			-- Extract number of faces detected
			set faceResults to faceRequest's results()
			set numFaces to count of faceResults
		end if

		if useRectangleDetection then
			-- Extract rectangle coordinates
			if theImage's |size|()'s width > 200 and theImage's |size|()'s height > 200 then
				set rectResults to rectRequest's results()
				set imgWidth to theImage's |size|()'s width
				set imgHeight to theImage's |size|()'s height
				set rectResult to {}
				repeat with observation in rectResults
					set midX to ((observation's bottomLeft()'s x) + (observation's bottomRight()'s x)) / 2 * imgWidth
					set midY to ((observation's bottomLeft()'s y) + (observation's topLeft()'s y)) / 2 * imgHeight
					set rectWidth to (observation's bottomRight()'s x) * imgWidth - (observation's bottomLeft()'s x) * imgWidth
					set rectHeight to (observation's topRight()'s y) * imgHeight - (observation's bottomRight()'s y) * imgHeight

					set midPointText to "Midpoint=(" & midX & "," & midY & ")"
					set dimensionsText to "Dimensions=" & rectWidth & "x" & rectHeight
					copy midPointText & " " & dimensionsText to end of rectResult
				end repeat
			end if
		end if

		if useSaliencyAnalysis then
			-- Identify areas most likely to draw attention
			set pointsOfInterest to ""
			set saliencyResults to saliencyRequest's results()
			repeat with observation in saliencyResults
				set salientObjects to observation's salientObjects()
				repeat with salientObject in salientObjects
					set bl to salientObject's bottomLeft()
					set br to salientObject's bottomRight()
					set tl to salientObject's topLeft()
					set tr to salientObject's topRight()

					set midX to ((bl's x) + (br's x)) / 2
					set midY to ((bl's y) + (tl's y)) / 2
					set pointsOfInterest to (pointsOfInterest & (" (" & midX as text) & "," & midY as text) & ")"
				end repeat
			end repeat
		end if

		if theText is not "" then
			imageData's setValue:theText forKey:"imageText"
			set promptText to "<Transcribed text of the image: \"" & theText & "\".>"
		end if

		if useSaliencyAnalysis then
			if pointsOfInterest is not "" then
				imageData's setValue:pointsOfInterest forKey:"imagePOI"
				set promptText to promptText & "<Areas most likely to draw attention: " & pointsOfInterest & ">"
			end if
		end if

		if useSubjectClassification then
			if length of classifications > 0 then
				imageData's setValue:classifications forKey:"imageSubjects"
				set promptText to promptText & "<Possible subject labels: " & classifications & ">"
			end if

			if theAnimals is not "" then
				imageData's setValue:theAnimals forKey:"imageAnimals"
				set promptText to promptText & "<Animals represented: " & theAnimals & ">"
			end if
		end if

		if useBarcodeDetection then
			if barcodeText is not "" then
				imageData's setValue:barcodeText forKey:"imageBarcodes"
				set promptText to promptText & "<Barcode or QR code payloads: " & barcodeText & ">"
			end if
		end if

		if useRectangleDetection then
			if theImage's |size|()'s width > 200 and theImage's |size|()'s height > 200 then
				set rectText to ""
				if (count of rectResult) > 0 then
					set promptText to promptText & "<Boundaries of rectangles: ###"
					set theIndex to 1
					repeat with rectCoords in rectResult
						set rect to "	Rectangle #" & theIndex & ": " & rectCoords & "
        "
						set rectText to rectText & "
" & trim(rect)
						set promptText to promptText & rect
						set theIndex to theIndex + 1
					end repeat
					set promptText to promptText & "###>"
				end if
				imageData's setValue:rectText forKey:"imageRectangles"
			end if
		end if

		if useFaceDetection then
			if numFaces > 0 then
				imageData's setValue:numFaces forKey:"imageFaces"
				set promptText to promptText & "<Number of faces: " & numFaces & ">"
			end if
		end if

		if useHorizonDetection then
			set horizonAngle to missing value
			set horizonResults to horizonRequest's results()
			if horizonResults's |count|() > 0 then
				set horizonAngle to (horizonResults's firstObject()'s angle()) * 180 / pi
			end if

			if horizonAngle is not missing value then
				set theScript to "" & horizonAngle & ".toFixed(2)"
				set theAngle to run script theScript in "JavaScript"
				imageData's setValue:((theAngle as text) & " degrees") forKey:"imageHorizon"
				set promptText to promptText & "<Angle of the horizon: " & theAngle & " degrees>"
			end if
		end if
	on error err
		return err
	end try

	imageData's setValue:promptText forKey:"stringValue"

	set jsonObj to current application's NSJSONSerialization's dataWithJSONObject:imageData options:(current application's NSJSONWritingFragmentsAllowed) |error|:(missing value)
	set jsonString to current application's NSString's alloc()'s initWithData:jsonObj encoding:(current application's NSUTF8StringEncoding)
	return jsonString as text
end run