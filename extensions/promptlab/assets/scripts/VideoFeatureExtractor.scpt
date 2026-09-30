//@osa-lang:JavaScript
function run(argv) {
  const filePath = argv[2];
  const useAudioDetails = argv[3];
  const useSubjectClassification = argv[4];
  const useFaceDetection = argv[5];
  const useRectangleDetection = argv[6];
  const useHorizonDetection = argv[7];
  const sampleCount = argv[8];

  ObjC.import("objc");
  ObjC.import("CoreMedia");
  ObjC.import("Foundation");
  ObjC.import("AVFoundation");
  ObjC.import("Vision");
  ObjC.import("AppKit");
  ObjC.import("CoreVideo");

  const assetURL = $.NSURL.fileURLWithPath(filePath);
  const options = $.NSDictionary.alloc.init;
  const asset = $.objc_getClass("AVAsset").assetWithURL(assetURL);

  if (!asset.js || asset.tracksWithMediaType($.AVMediaTypeVideo).count == 0) {
    return "";
  }

  const instructions = [];
  const confidenceThreshold = 0.7;

  const reader = $.objc_getClass("AVAssetReader").alloc.initWithAssetError(
    asset,
    null
  );
  const track = asset.tracksWithMediaType($.AVMediaTypeVideo).objectAtIndex(0);
  const settings = $.NSDictionary.dictionaryWithObjectForKey(
    "420v",
    "PixelFormatType"
  );
  readerOutput = $.objc_getClass(
    "AVAssetReaderTrackOutput"
  ).alloc.initWithTrackOutputSettings(track, settings);
  reader.addOutput(readerOutput);
  reader.startReading;

  const maxCount = 15;
  samples = [];
  let buf = Ref();
  while (
    samples.length < maxCount &&
    reader.status != $.AVAssetReaderStatusCompleted &&
    reader.status != $.AVAssetReaderStatusFailed
  ) {
    buf = readerOutput.copyNextSampleBuffer;
    samples.push(buf);
  }

  const texts = [];
  const classifications = [];
  const animals = [];
  let faces = 0;
  const rects = [];
  let horizon = [];

  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i];
    const presentationTime = $.CMSampleBufferGetPresentationTimeStamp(sample);
    const imageBufferRef = ObjC.castRefToObject(
      $.CMSampleBufferGetImageBuffer(samples[samples.length - i - 1])
    );

    const imgWidth = $.CVPixelBufferGetWidth(imageBufferRef);
    const imgHeight = $.CVPixelBufferGetHeight(imageBufferRef);

    const requestHandler =
      $.VNImageRequestHandler.alloc.initWithCVPixelBufferOptions(
        imageBufferRef,
        $.NSDictionary.alloc.init
      );

    const textRequest = $.VNRecognizeTextRequest.alloc.init;
    const classificationRequest = $.VNClassifyImageRequest.alloc.init;
    const animalRequest = $.VNRecognizeAnimalsRequest.alloc.init;
    const faceRequest = $.VNDetectFaceRectanglesRequest.alloc.init;
    const rectRequest = $.VNDetectRectanglesRequest.alloc.init;
	const horizonRequest = $.VNDetectHorizonRequest.alloc.init;
    rectRequest.maximumObservations = 0;

    requestHandler.performRequestsError(
      ObjC.wrap([
        textRequest,
        classificationRequest,
        animalRequest,
        faceRequest,
        rectRequest,
		horizonRequest,
      ]),
      null
    );

    const textResults = textRequest.results;
    const classificationResults = classificationRequest.results;
    const animalResults = animalRequest.results;
    const faceResults = faceRequest.results;
    const rectResults = rectRequest.results;
	const horizonResults = horizonRequest.results;

    const sampleTexts = [];
    for (let i = 0; i < textResults.count; i++) {
      const observation = textResults.objectAtIndex(i);
      const observationText = observation.topCandidates(1).objectAtIndex(0)
        .string.js;
      sampleTexts.push(observationText);
    }

    sampleTexts.forEach((text) => {
      if (!texts.includes(text)) {
        texts.push(text);
      }
    });

    for (let i = 0; i < classificationResults.count; i++) {
      const observation = classificationResults.objectAtIndex(i);
      const identifier = observation.identifier.js;
      if (
        observation.confidence > confidenceThreshold &&
        !classifications.includes(identifier)
      ) {
        classifications.push(`${identifier} (${Math.round(observation.confidence * 100)}% likelihood)`);
      }
    }

    for (let i = 0; i < animalResults.count; i++) {
      const observation = animalResults.objectAtIndex(i);
      const labels = observation.labels;
      for (let j = 0; j < labels.count; j++) {
        animals.push(labels.objectAtIndex(j).identifier.js);
      }
    }

    faces = faceResults.count;

    for (let i = 0; i < rectResults.count; i++) {
      const observation = rectResults.objectAtIndex(i);
      if (observation.confidence <= confidenceThreshold) {
        continue;
      }
      const box = observation.boundingBox;
      const origin = box.origin;
      const size = box.size;
      rects.push(
        `<There is a rectangular object centered at (${Math.round(
          origin.x * imgWidth
        )}, ${Math.round(origin.y * imgHeight)}) with a width of ${Math.round(
          size.width * imgWidth
        )} and height of ${Math.round(size.height * imgHeight)}.>`
      );
    }

	if (horizonResults.count > 0) {
		const horizonAngle = horizonResults.firstObject.angle * 180 / Math.PI
		if (horizonAngle != undefined) {
			const theAngle = horizonAngle.toFixed(2)
			horizon.push(theAngle)
		}
	}
  }

  if (texts.length > 0) {
    instructions.push(
      '<Transcribed text of the first few frames: """' +
        texts.join(", ") +
        '""">'
    );
  }

  if (useSubjectClassification == "true" && classifications.length > 0) {
    instructions.push(
      "<Possible subject labels: `" +
        classifications.join(", ") +
        "`.>"
    );
  }

  if (useSubjectClassification == "true" && animals.length > 0) {
    instructions.push(
      "<Animals represented: `" +
        animals.join(", ") +
        "`.>"
    );
  }

  if (useFaceDetection == "true" && faces > 0) {
    instructions.push(
      `<Number of faces: ${faces}>`
    );
  }

  if (useRectangleDetection == "true" && rects.length > 0) {
    instructions.push(...rects);
  }

  if (useHorizonDetection == "true" && horizon.length > 0) {
  	instructions.push(`<Angles (degrees) of the horizon over ${samples.length} frames: ${horizon.join(", ")}>`)
  }

  return instructions.join(`
`);
}
