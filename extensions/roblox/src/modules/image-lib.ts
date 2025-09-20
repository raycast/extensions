// Code //
import fetch from "cross-fetch";

type ImageData = {
  fileBuffer: Buffer;
  contentType: string;
};

type ImageCache = {
  [assetId: string]: ImageData;
};

const imageCache: ImageCache = {};

function getImageContentType(buffer: Buffer) {
  const magicNumbers = {
    "image/jpg": ["ffd8ff", "ffd8ffe0", "ffd8ffe1"], // Added variations for JPEG
    "image/png": "89504e47",
    "image/gif": "47494638",
    "image/bmp": "424d",
  };

  const magicNumber = buffer.toString("hex", 0, 4); // Convert to hex

  // Loop through the magic numbers to find a match
  for (const [type, signature] of Object.entries(magicNumbers)) {
    if (Array.isArray(signature)) {
      // If the signature is an array, check each variant
      for (const variant of signature) {
        if (magicNumber.startsWith(variant)) {
          return type; // Return the type if a variant matches
        }
      }
    } else {
      // If the signature is a string, check directly
      if (magicNumber.startsWith(signature)) {
        return type;
      }
    }
  }

  return null; // Return null if no image type matches
}

export async function grabImage(assetId: number) {
  // Check if the image is already in the cache.
  if (imageCache[assetId]) {
    return imageCache[assetId];
  }

  try {
    // Fetch the image if not in cache.
    const response = await fetch(`https://assetdelivery.roblox.com/v1/asset/?ID=${assetId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch image. Status: ${response.status}`);
    }

    // Convert ArrayBuffer -> Node Buffer
    const arrayBuffer = await response.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Grab Real Content-Type
    const contentType = getImageContentType(fileBuffer);
    if (!contentType) {
      throw new Error("Not an image!");
    }

    // Cache the image data and content type.
    const imageData = {
      fileBuffer,
      contentType,
    };
    imageCache[assetId] = imageData;

    return imageData;
  } catch (error) {
    return null;
  }
}
