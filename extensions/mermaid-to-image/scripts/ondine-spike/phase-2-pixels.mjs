export const MAX_IMAGE_PIXELS = 4096 * 4096;

function validateDimensions({ width, height }) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error("Image dimensions must be positive integers");
  }
  if (width * height > MAX_IMAGE_PIXELS) throw new Error("Image pixel limit exceeded");
}

export async function decodeImage(src, ImageType = Image) {
  const image = new ImageType();
  image.src = src;
  await image.decode();
  validateDimensions({ width: image.naturalWidth, height: image.naturalHeight });
  return image;
}

export function compareRgba(left, right) {
  for (const image of [left, right]) {
    validateDimensions(image);
    if (image.data.length !== image.width * image.height * 4) throw new Error("RGBA buffer length mismatch");
  }
  if (left.width !== right.width || left.height !== right.height) throw new Error("Image dimension mismatch");
  const diff = new Uint8ClampedArray(left.data.length);
  let changedPixels = 0;
  let maxChannelDelta = 0;
  for (let offset = 0; offset < left.data.length; offset += 4) {
    let pixelDelta = 0;
    for (let channel = 0; channel < 4; channel++) {
      const delta = Math.abs(left.data[offset + channel] - right.data[offset + channel]);
      pixelDelta = Math.max(pixelDelta, delta);
      maxChannelDelta = Math.max(maxChannelDelta, delta);
      if (channel < 3) diff[offset + channel] = delta * 32;
      else diff[offset] = Math.max(diff[offset], delta * 32);
    }
    if (pixelDelta) changedPixels++;
    diff[offset + 3] = 255;
  }
  const totalPixels = left.width * left.height;
  return { changedPixels, maxChannelDelta, totalPixels, changedPixelFraction: changedPixels / totalPixels, diff };
}

export function imagePixels(image) {
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  validateDimensions({ width, height });
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0);
  return { width, height, data: context.getImageData(0, 0, width, height).data };
}

export function encodePixels({ width, height, data }) {
  validateDimensions({ width, height });
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").putImageData(new ImageData(data, width, height), 0, 0);
  return canvas.toDataURL("image/png");
}
