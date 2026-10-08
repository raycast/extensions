import * as Jimp from "jimp";
import path from "path";

export async function customize(imagePath: string, padding: number, shades: boolean) {
  const padding_top = padding || 45;

  try {
    const image = await Jimp.read(imagePath);
    const baseImage = await Jimp.read(path.join(__dirname, "assets/default-folder.png"));

    const baseWidth = baseImage.bitmap.width;
    const baseHeight = baseImage.bitmap.height;

    const width = baseImage.bitmap.width - 5 * (2 * padding_top);
    const height = Math.round((image.bitmap.height / image.bitmap.width) * width);

    image.resize(width, height);

    if (shades) {
      // Convert image to grayscale
      image.grayscale();
      // Calculate the average luminance
      let totalLuminance = 0;
      image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
        const grayValue = this.bitmap.data[idx]; // Since the image is grayscale, R=G=B
        totalLuminance += grayValue;
      });
      const avgLuminance = totalLuminance / (image.bitmap.width * image.bitmap.height);

      // Apply "folder blue" with different levels of transparency based on grayscale values
      image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
        const grayValue = this.bitmap.data[idx];
        const alpha = this.bitmap.data[idx + 3]; // Original alpha value

        // Only modify non-transparent pixels
        if (alpha !== 0) {
          const alphaValue = 255 - grayValue; // Invert adjusted grayscale value to get alpha

          this.bitmap.data[idx] = 0; // Red channel
          this.bitmap.data[idx + 1] = 129; // Green channel
          this.bitmap.data[idx + 2] = 202; // Blue channel
          this.bitmap.data[idx + 3] = alphaValue; // Alpha channel
        }
      });
      if (avgLuminance > 200) {
        image.brightness(-1);
      }
    } else {
      // Change image color to "folder blue" without shading
      image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
        if (this.bitmap.data[idx + 3] !== 0) {
          this.bitmap.data[idx] = 0;
          this.bitmap.data[idx + 1] = 129;
          this.bitmap.data[idx + 2] = 202;
        }
      });
    }

    const x = (baseImage.bitmap.width - image.bitmap.width) / 2;
    const y = (baseImage.bitmap.height - image.bitmap.height) / 2 + padding_top;

    baseImage.composite(image, x, y);

    // Create original size image
    const base64BaseImage = await baseImage.getBase64Async(Jimp.AUTO);

    // Create preview image
    baseImage.resize(baseImage.bitmap.width / 3, Jimp.AUTO);
    const base64PreviewImage = await baseImage.getBase64Async(Jimp.AUTO);

    return {
      base64BaseImage,
      base64PreviewImage,
      baseWidth,
      baseHeight,
    };
  } catch (err) {
    console.error(err);
    return null;
  }
}
