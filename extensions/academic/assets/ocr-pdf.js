ObjC.import("AppKit");
ObjC.import("Foundation");
ObjC.import("PDFKit");
ObjC.import("Vision");

function run(argv) {
  if (!argv.length) throw new Error("A PDF path is required");
  const path = argv[0];
  const requestedPages = Math.max(1, Math.min(5, Number(argv[1] || "3")));
  const document = $.PDFDocument.alloc.initWithURL(
    $.NSURL.fileURLWithPath(path),
  );
  if (!document) throw new Error("The PDF could not be opened");

  const pages = Math.min(requestedPages, Number(document.pageCount));
  const output = [];
  for (let index = 0; index < pages; index += 1) {
    const page = document.pageAtIndex(index);
    if (!page) continue;
    const image = page.thumbnailOfSizeForBox(
      $.NSMakeSize(1800, 2400),
      $.kPDFDisplayBoxMediaBox,
    );
    const representation = $.NSBitmapImageRep.imageRepWithData(
      image.TIFFRepresentation,
    );
    if (!representation) continue;

    const request = $.VNRecognizeTextRequest.alloc.init;
    request.recognitionLevel = $.VNRequestTextRecognitionLevelAccurate;
    request.usesLanguageCorrection = true;
    const handler = $.VNImageRequestHandler.alloc.initWithCGImageOptions(
      representation.CGImage,
      $({}),
    );
    const error = Ref();
    const succeeded = handler.performRequestsError($([request]), error);
    if (!succeeded) {
      const message = error[0]
        ? ObjC.unwrap(error[0].localizedDescription)
        : "Vision OCR failed";
      throw new Error(message);
    }

    const observations = request.results;
    const lines = [];
    for (let item = 0; item < Number(observations.count); item += 1) {
      const candidates = observations.objectAtIndex(item).topCandidates(1);
      if (Number(candidates.count) > 0) {
        lines.push(ObjC.unwrap(candidates.firstObject.string));
      }
    }
    output.push(lines.join("\n"));
  }
  return output.join("\n\n--- PAGE ---\n\n");
}
