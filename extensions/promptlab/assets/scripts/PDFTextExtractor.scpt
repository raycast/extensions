#@osa-lang:AppleScript
use framework "PDFKit"
use framework "Quartz"
use framework "Vision"

on run (argv)
	set filePath to item 3 of argv
	set useOCR to item 4 of argv is "true"
	set pageLimit to item 5 of argv
	set useMetadata to item 6 of argv is "true"

	set theURL to current application's |NSURL|'s fileURLWithPath:filePath
	set thePDF to current application's PDFDocument's alloc()'s initWithURL:theURL
	set pdfData to current application's NSMutableDictionary's alloc()'s init()
	set pdfText to ""

	set ocrText to ""
	if useOCR then
		set numPages to thePDF's pageCount()

		if pageLimit < numPages then
			set numPages to pageLimit
		end if

		repeat with i from 0 to numPages - 1
			set thePage to (thePDF's pageAtIndex:i)
			set theBounds to (thePage's boundsForBox:(current application's kPDFDisplayBoxMediaBox))
			set pageImage to (current application's NSImage's alloc()'s initWithSize:(item 2 of theBounds))
			pageImage's lockFocus()
			(thePage's drawWithBox:(current application's kPDFDisplayBoxMediaBox))
			pageImage's unlockFocus()

			set requestHandler to (current application's VNImageRequestHandler's alloc()'s initWithData:(pageImage's TIFFRepresentation()) options:(current application's NSDictionary's alloc()'s init()))
			set textRequest to current application's VNRecognizeTextRequest's alloc()'s init()
			(requestHandler's performRequests:{textRequest} |error|:(missing value))

			set textResults to textRequest's results()

			repeat with observation in textResults
				set ocrText to ocrText & ((first item in (observation's topCandidates:1))'s |string|() as text) & ", "
			end repeat
		end repeat
		set pdfText to ocrText
	end if
	pdfData's setValue:ocrText forKey:"pdfOCRText"

	set rawText to thePDF's |string|() as text
	set pdfText to pdfText & rawText
	pdfData's setValue:rawText forKey:"pdfRawText"

	if useMetadata then
		set pdfText to pdfText & "

" & (thePDF's documentAttributes()'s description() as text)
	end if

	pdfData's setValue:pdfText forKey:"stringValue"

	set pageCount to thePDF's pageCount()
	pdfData's setValue:pageCount forKey:"pageCount"

	set jsonObj to current application's NSJSONSerialization's dataWithJSONObject:pdfData options:(current application's NSJSONWritingFragmentsAllowed) |error|:(missing value)
	set jsonString to current application's NSString's alloc()'s initWithData:jsonObj encoding:(current application's NSUTF8StringEncoding)
	return jsonString as text
end run