// JXA exposes the system AppKit / Vision APIs without shipping a native executable.
export const qrDecoderScript = String.raw`
ObjC.import('AppKit');
ObjC.import('CoreImage');
ObjC.import('Vision');

function clipboardImage(pasteboard) {
  const items = pasteboard.pasteboardItems;
  const imageTypes = ObjC.deepUnwrap($.NSImage.imageTypes);
  if (!items.isNil()) {
    for (let index = 0; index < items.count; index++) {
      const item = items.objectAtIndex(index);
      const file = item.stringForType($.NSPasteboardTypeFileURL);
      if (!file.isNil()) {
        const url = $.NSURL.URLWithString(file);
        if (!url.isNil() && url.isFileURL) {
          const image = $.NSImage.alloc.initWithContentsOfURL(url);
          if (!image.isNil()) return image;
        }
      }
      const types = Array.from(new Set([
        'public.png', 'public.tiff',
        ...ObjC.deepUnwrap(item.types).filter(type => imageTypes.includes(type))
      ]));
      for (const type of types) {
        const data = item.dataForType($(type));
        if (data.isNil()) continue;
        const image = $.NSImage.alloc.initWithData(data);
        if (!image.isNil()) return image;
      }
    }
  }
  const image = $.NSImage.alloc.initWithPasteboard(pasteboard);
  if (!image.isNil()) return image;
  throw Error('No image found in the clipboard. Copy a screenshot or image file first.');
}

function decodeImage(image) {
  if (image.isNil()) throw Error('Unable to read this image. Try a PNG or JPEG file.');
  const input = $.CIImage.imageWithData(image.TIFFRepresentation);
  if (input.isNil()) throw Error('Unable to read this image. Try a PNG or JPEG file.');
  const request = $.VNDetectBarcodesRequest.alloc.init;
  request.symbologies = $([$.VNBarcodeSymbologyQR]);
  const handler = $.VNImageRequestHandler.alloc.initWithCIImageOptions(input, $({}));
  if (!handler.performRequestsError($([request]), Ref())) {
    throw Error('Unable to decode QR codes. Try a clearer image.');
  }
  const observations = [];
  const results = request.results;
  for (let index = 0; index < results.count; index++) {
    const observation = results.objectAtIndex(index);
    const text = ObjC.unwrap(observation.payloadStringValue);
    if (text) observations.push({ text, bounds: observation.boundingBox });
  }
  observations.sort((left, right) => {
    const leftY = left.bounds.origin.y + left.bounds.size.height / 2;
    const rightY = right.bounds.origin.y + right.bounds.size.height / 2;
    return Math.abs(leftY - rightY) > 0.05
      ? rightY - leftY
      : left.bounds.origin.x - right.bounds.origin.x;
  });
  const codes = Array.from(new Set(observations.map(observation => observation.text)));
  if (!codes.length) throw Error('No QR code found in the image. Try a clearer image.');
  return codes;
}

function run(args) {
  try {
    const image = args.length
      ? $.NSImage.alloc.initWithContentsOfFile(args[0])
      : clipboardImage($.NSPasteboard.generalPasteboard);
    return JSON.stringify({ codes: decodeImage(image) });
  } catch (error) {
    return JSON.stringify({ codes: [], error: String(error.message) });
  }
}
`;
