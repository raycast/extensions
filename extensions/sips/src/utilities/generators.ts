/**
 * @file utilities/generators.ts
 *
 * @summary Image generators and associated utilities.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-06 11:54:14
 * Last modified  : 2024-06-26 21:37:46
 */

import { runAppleScript } from "@raycast/utils";

import { Generator, GeneratorKey } from "./types";

/**
 * Common single dimension values for images. These are permuted to generate the available image sizes.
 */
export const standardDimensions = [1024, 512, 256, 128, 100, 64, 50, 32];

/**
 * Generates a placeholder image of the specified dimensions. The image is a solid gray color.
 *
 * @param width The width of the image.
 * @param height The height of the image.
 * @param destination The destination path for the image.
 * @returns A promise that resolves when the image has been generated and saved. If no destination is specified, the promise resolves with the data URL of the generated image.
 */
export const generatePlaceholder = async (width: number, height: number, destination?: string) => {
  return runAppleScript(`use framework "Foundation"
        use framework "Quartz"
        
        set theCIImage to current application's CIImage's imageWithColor:(current application's CIColor's grayColor())
        set theBounds to current application's NSMakeRect(0, 0, ${width}, ${height})
        set croppedOutput to theCIImage's imageByCroppingToRect:theBounds
        
        -- Convert back to NSImage and save to file
        set theRep to current application's NSCIImageRep's imageRepWithCIImage:croppedOutput
        set theResult to current application's NSImage's alloc()'s initWithSize:(theRep's |size|())
        theResult's addRepresentation:theRep
        ${
          destination == undefined
            ? `set theTIFFData to theResult's TIFFRepresentation()
              set theBitmapImageRep to current application's NSBitmapImageRep's imageRepWithData:theTIFFData
              set theResultData to theBitmapImageRep's representationUsingType:(current application's NSPNGFileType) |properties|:(missing value)
              set theBase64String to theResultData's base64EncodedStringWithOptions:0
              return "data:image/png;base64," & theBase64String`
            : `saveImage(theResult, "${destination}")
        
        on saveImage(imageToSave, destinationPath)
            -- Saves an NSImage to the supplied file path
            set theTIFFData to imageToSave's TIFFRepresentation()
            set theBitmapImageRep to current application's NSBitmapImageRep's imageRepWithData:theTIFFData
            set theResultData to theBitmapImageRep's representationUsingType:(current application's NSPNGFileType) |properties|:(missing value)
            theResultData's writeToFile:destinationPath atomically:false
        end saveImage`
        }`);
};

/**
 * Generates a data URL of a preview image for the specified CIFilter.
 *
 * @param CIFilterName The name of the CIFilter to generate a preview for.
 * @param inputs The input key/value pairs for the CIFilter.
 * @returns A promise that resolves with the data URL of the generated preview.
 */
export const generatePreview = async (CIFilterName: string, inputs: { [key: string]: unknown }) => {
  return runAppleScript(
    `use framework "Foundation"
      use framework "Quartz"
      use scripting additions
      
      set filterName to "${CIFilterName}"
      set theFilter to current application's CIFilter's filterWithName:filterName
      theFilter's setDefaults()

      set imgWidth to 256
      set imgHeight to 256
  
      set theCIImage to current application's CIImage's emptyImage()
      ${Object.entries(inputs)
        .map(([key, value]) => `theFilter's setValue:(${value}) forKey:"${key}"`)
        .join("\n")}
      
      set theBounds to current application's NSMakeRect(0, 0, imgWidth, imgHeight)
      set uncroppedOutput to theFilter's valueForKey:(current application's kCIOutputImageKey)
      set croppedOutput to uncroppedOutput's imageByCroppingToRect:theBounds
      
      -- Convert back to NSImage and save to file
      set theRep to current application's NSCIImageRep's imageRepWithCIImage:croppedOutput
      set theResult to current application's NSImage's alloc()'s initWithSize:(theRep's |size|())
      theResult's addRepresentation:theRep

      -- Saves an NSImage to the supplied file path
      set theTIFFData to theResult's TIFFRepresentation()
      set theBitmapImageRep to current application's NSBitmapImageRep's imageRepWithData:theTIFFData
      set theResultData to theBitmapImageRep's representationUsingType:(current application's NSPNGFileType) |properties|:(missing value)
      set theBase64String to (theResultData's base64EncodedStringWithOptions:0) as text
      return "data:image/png;base64," & theBase64String
  `,
    {
      timeout: 0,
    },
  );
};

/**
 * Generates a full-size render of the specified CIFilter.
 *
 * @param destination The destination path for the generated image.
 * @param CIFilterName The name of the CIFilter to generate a preview for.
 * @param width The width of the generated image.
 * @param height The height of the generated image.
 * @param inputs The input key/value pairs for the CIFilter.
 * @returns A promise that resolves when the image has been generated and saved.
 */
export const generate = async (
  destination: string,
  CIFilterName: string,
  width: number,
  height: number,
  inputs: { [key: string]: unknown },
) => {
  return runAppleScript(`use framework "Foundation"
    use framework "Quartz"
    use scripting additions
    
    set filterName to "${CIFilterName}"
    set theFilter to current application's CIFilter's filterWithName:filterName
    theFilter's setDefaults()

    set imgWidth to ${width}
    set imgHeight to ${height}

    set theCIImage to current application's CIImage's emptyImage()
    ${Object.entries(inputs)
      .map(([key, value]) => `theFilter's setValue:(${value}) forKey:"${key}"`)
      .join("\n")}
    
    set theBounds to current application's NSMakeRect(0, 0, imgWidth, imgHeight)
    set uncroppedOutput to theFilter's valueForKey:(current application's kCIOutputImageKey)
    set croppedOutput to uncroppedOutput's imageByCroppingToRect:theBounds
    
    -- Convert back to NSImage and save to file
    set theRep to current application's NSCIImageRep's imageRepWithCIImage:croppedOutput
    set theResult to current application's NSImage's alloc()'s initWithSize:(theRep's |size|())
    theResult's addRepresentation:theRep
    saveImage(theResult, "${destination}")
    
    on saveImage(imageToSave, destinationPath)
        -- Saves an NSImage to the supplied file path
        set theTIFFData to imageToSave's TIFFRepresentation()
        set theBitmapImageRep to current application's NSBitmapImageRep's imageRepWithData:theTIFFData
        set theResultData to theBitmapImageRep's representationUsingType:(current application's NSPNGFileType) |properties|:(missing value)
        theResultData's writeToFile:destinationPath atomically:false
    end saveImage`);
};

/**
 * All available generators.
 */
export const generators: { [key in GeneratorKey]: Generator } = {
  Checkerboard: {
    applyMethod: generate,
    CIFilterName: "CICheckerboardGenerator",
    name: "Checkerboard",
    thumbnail: "thumbnails/checkerboard.webp",
  },
  ConstantColor: {
    applyMethod: generate,
    CIFilterName: "CIConstantColorGenerator",
    name: "Constant Color",
    thumbnail: "thumbnails/constant_color.webp",
  },
  LenticularHalo: {
    applyMethod: generate,
    CIFilterName: "CILenticularHaloGenerator",
    name: "Lenticular Halo",
    thumbnail: "thumbnails/lenticular_halo.webp",
  },
  LinearGradient: {
    applyMethod: generate,
    CIFilterName: "CILinearGradient",
    name: "Linear Gradient",
    thumbnail: "thumbnails/linear_gradient.webp",
  },
  RadialGradient: {
    applyMethod: generate,
    CIFilterName: "CIRadialGradient",
    name: "Radial Gradient",
    thumbnail: "thumbnails/radial_gradient.webp",
  },
  Random: {
    applyMethod: generate,
    CIFilterName: "CIRandomGenerator",
    name: "Random",
    thumbnail: "thumbnails/random.webp",
  },
  StarShine: {
    applyMethod: generate,
    CIFilterName: "CIStarShineGenerator",
    name: "Star Shine",
    thumbnail: "thumbnails/star_shine.webp",
  },
  Stripes: {
    applyMethod: generate,
    CIFilterName: "CIStripesGenerator",
    name: "Stripes",
    thumbnail: "thumbnails/stripes.webp",
  },
  Sunbeams: {
    applyMethod: generate,
    CIFilterName: "CISunbeamsGenerator",
    name: "Sunbeams",
    thumbnail: "thumbnails/sunbeams.webp",
  },
};

// The rest of this file is made up of helper functions for generating CIFilter inputs.

export const getCheckerboardOptions = (
  redValues: number[],
  greenValues: number[],
  blueValues: number[],
  alphaValues: number[],
  customSize?: number,
) => [
  {
    inputColor0: `current application's CIColor's colorWithRed:${redValues[0] / 255} green:${
      greenValues[0] / 255
    } blue:${blueValues[0] / 255} alpha:${alphaValues[0] / 255}`,
    inputColor1: `current application's CIColor's colorWithRed:${redValues[1] / 255} green:${
      greenValues[1] / 255
    } blue:${blueValues[1] / 255} alpha:${alphaValues[1] / 255}`,
    inputWidth: `imgWidth / ${customSize || 4}`,
  },
  {
    inputColor0: `current application's CIColor's colorWithRed:${redValues[2] / 255} green:${
      greenValues[2] / 255
    } blue:${blueValues[2] / 255} alpha:${alphaValues[2] / 255}`,
    inputColor1: `current application's CIColor's colorWithRed:${redValues[3] / 255} green:${
      greenValues[3] / 255
    } blue:${blueValues[3] / 255} alpha:${alphaValues[3] / 255}`,
    inputWidth: "imgWidth / 8",
  },
  {
    inputColor0: `current application's CIColor's colorWithRed:${redValues[4] / 255} green:${
      greenValues[4] / 255
    } blue:${blueValues[4] / 255} alpha:${alphaValues[4] / 255}`,
    inputColor1: `current application's CIColor's colorWithRed:${redValues[5] / 255} green:${
      greenValues[5] / 255
    } blue:${blueValues[5] / 255} alpha:${alphaValues[5] / 255}`,
    inputWidth: "imgWidth / 16",
  },
  {
    inputColor0: `current application's CIColor's colorWithRed:${redValues[6] / 255} green:${
      greenValues[6] / 255
    } blue:${blueValues[6] / 255} alpha:${alphaValues[6] / 255}`,
    inputColor1: `current application's CIColor's colorWithRed:${redValues[7] / 255} green:${
      greenValues[7] / 255
    } blue:${blueValues[7] / 255} alpha:${alphaValues[7] / 255}`,
    inputWidth: "imgWidth / 32",
  },
  {
    inputColor0: `current application's CIColor's colorWithRed:${redValues[8] / 255} green:${
      greenValues[8] / 255
    } blue:${blueValues[8] / 255} alpha:${alphaValues[8] / 255}`,
    inputColor1: `current application's CIColor's colorWithRed:${redValues[9] / 255} green:${
      greenValues[9] / 255
    } blue:${blueValues[9] / 255} alpha:${alphaValues[9] / 255}`,
    inputWidth: "imgWidth / 64",
  },
];

export const getStripeOptions = (
  redValues: number[],
  greenValues: number[],
  blueValues: number[],
  alphaValues: number[],
  customSize?: number,
) => [
  {
    inputColor0: `current application's CIColor's colorWithRed:${redValues[0] / 255} green:${
      greenValues[0] / 255
    } blue:${blueValues[0] / 255} alpha:${alphaValues[0] / 255}`,
    inputColor1: `current application's CIColor's colorWithRed:${redValues[1] / 255} green:${
      greenValues[1] / 255
    } blue:${blueValues[1] / 255} alpha:${alphaValues[1] / 255}`,
    inputWidth: `imgWidth / ${customSize || 4}`,
  },
  {
    inputColor0: `current application's CIColor's colorWithRed:${redValues[2] / 255} green:${
      greenValues[2] / 255
    } blue:${blueValues[2] / 255} alpha:${alphaValues[2] / 255}`,
    inputColor1: `current application's CIColor's colorWithRed:${redValues[3] / 255} green:${
      greenValues[3] / 255
    } blue:${blueValues[3] / 255} alpha:${alphaValues[3] / 255}`,
    inputWidth: "imgWidth / 8",
  },
  {
    inputColor0: `current application's CIColor's colorWithRed:${redValues[4] / 255} green:${
      greenValues[4] / 255
    } blue:${blueValues[4] / 255} alpha:${alphaValues[4] / 255}`,
    inputColor1: `current application's CIColor's colorWithRed:${redValues[5] / 255} green:${
      greenValues[5] / 255
    } blue:${blueValues[5] / 255} alpha:${alphaValues[5] / 255}`,
    inputWidth: "imgWidth / 16",
  },
  {
    inputColor0: `current application's CIColor's colorWithRed:${redValues[6] / 255} green:${
      greenValues[6] / 255
    } blue:${blueValues[6] / 255} alpha:${alphaValues[6] / 255}`,
    inputColor1: `current application's CIColor's colorWithRed:${redValues[7] / 255} green:${
      greenValues[7] / 255
    } blue:${blueValues[7] / 255} alpha:${alphaValues[7] / 255}`,
    inputWidth: "imgWidth / 32",
  },
  {
    inputColor0: `current application's CIColor's colorWithRed:${redValues[8] / 255} green:${
      greenValues[8] / 255
    } blue:${blueValues[8] / 255} alpha:${alphaValues[8] / 255}`,
    inputColor1: `current application's CIColor's colorWithRed:${redValues[9] / 255} green:${
      greenValues[9] / 255
    } blue:${blueValues[9] / 255} alpha:${alphaValues[9] / 255}`,
    inputWidth: "imgWidth / 64",
  },
];

export const getSolidColorOptions = (redValues: number[], greenValues: number[], blueValues: number[]) =>
  Array(10)
    .fill(0)
    .map((_, i) => ({
      inputColor: `current application's CIColor's colorWithRed:${redValues[i] / 255} green:${
        greenValues[i] / 255
      } blue:${blueValues[i] / 255} alpha:1.0`,
    }));

export const getLinearGradientOptions = (
  redValues: number[],
  greenValues: number[],
  blueValues: number[],
  alphaValues: number[],
) => [
  {
    inputColor0: `current application's CIColor's colorWithRed:${redValues[0] / 255} green:${
      greenValues[0] / 255
    } blue:${blueValues[0] / 255} alpha:${alphaValues[0] / 255}`,
    inputColor1: `current application's CIColor's colorWithRed:${redValues[1] / 255} green:${
      greenValues[1] / 255
    } blue:${blueValues[1] / 255} alpha:${alphaValues[1] / 255}`,
    inputPoint0: `current application's CIVector's vectorWithX:((random number) * imgWidth) Y:((random number) * imgHeight)`,
    inputPoint1: `current application's CIVector's vectorWithX:((random number) * imgWidth) Y:((random number) * imgHeight)`,
  },
  {
    inputColor0: `current application's CIColor's colorWithRed:${redValues[2] / 255} green:${
      greenValues[2] / 255
    } blue:${blueValues[2] / 255} alpha:${alphaValues[2] / 255}`,
    inputColor1: `current application's CIColor's colorWithRed:${redValues[3] / 255} green:${
      greenValues[3] / 255
    } blue:${blueValues[3] / 255} alpha:${alphaValues[3] / 255}`,
    inputPoint0: `current application's CIVector's vectorWithX:((random number) * imgWidth) Y:((random number) * imgHeight)`,
    inputPoint1: `current application's CIVector's vectorWithX:((random number) * imgWidth) Y:((random number) * imgHeight)`,
  },
  {
    inputColor0: `current application's CIColor's colorWithRed:${redValues[4] / 255} green:${
      greenValues[4] / 255
    } blue:${blueValues[4] / 255} alpha:${alphaValues[4] / 255}`,
    inputColor1: `current application's CIColor's colorWithRed:${redValues[5] / 255} green:${
      greenValues[5] / 255
    } blue:${blueValues[5] / 255} alpha:${alphaValues[5] / 255}`,
    inputPoint0: `current application's CIVector's vectorWithX:((random number) * imgWidth) Y:((random number) * imgHeight)`,
    inputPoint1: `current application's CIVector's vectorWithX:((random number) * imgWidth) Y:((random number) * imgHeight)`,
  },
  {
    inputColor0: `current application's CIColor's colorWithRed:${redValues[6] / 255} green:${
      greenValues[6] / 255
    } blue:${blueValues[6] / 255} alpha:${alphaValues[6] / 255}`,
    inputColor1: `current application's CIColor's colorWithRed:${redValues[7] / 255} green:${
      greenValues[7] / 255
    } blue:${blueValues[7] / 255} alpha:${alphaValues[7] / 255}`,
    inputPoint0: `current application's CIVector's vectorWithX:((random number) * imgWidth) Y:((random number) * imgHeight)`,
    inputPoint1: `current application's CIVector's vectorWithX:((random number) * imgWidth) Y:((random number) * imgHeight)`,
  },
  {
    inputColor0: `current application's CIColor's colorWithRed:${redValues[8] / 255} green:${
      greenValues[8] / 255
    } blue:${blueValues[8] / 255} alpha:${alphaValues[8] / 255}`,
    inputColor1: `current application's CIColor's colorWithRed:${redValues[9] / 255} green:${
      greenValues[9] / 255
    } blue:${blueValues[9] / 255} alpha:${alphaValues[9] / 255}`,
    inputPoint0: `current application's CIVector's vectorWithX:((random number) * imgWidth) Y:((random number) * imgHeight)`,
    inputPoint1: `current application's CIVector's vectorWithX:((random number) * imgWidth) Y:((random number) * imgHeight)`,
  },
];

export const getRadialGradientOptions = (
  redValues: number[],
  greenValues: number[],
  blueValues: number[],
  alphaValues: number[],
) => [
  {
    inputColor0: `current application's CIColor's colorWithRed:${redValues[0] / 255} green:${
      greenValues[0] / 255
    } blue:${blueValues[0] / 255} alpha:${alphaValues[0] / 255}`,
    inputColor1: `current application's CIColor's colorWithRed:${redValues[1] / 255} green:${
      greenValues[1] / 255
    } blue:${blueValues[1] / 255} alpha:${alphaValues[1] / 255}`,
    inputCenter: `current application's CIVector's vectorWithX:((random number) * imgWidth) Y:((random number) * imgHeight)`,
    inputRadius0: `((random number) * imgWidth)`,
    inputRadius1: `((random number) * imgWidth)`,
  },
  {
    inputColor0: `current application's CIColor's colorWithRed:${redValues[2] / 255} green:${
      greenValues[2] / 255
    } blue:${blueValues[2] / 255} alpha:${alphaValues[2] / 255}`,
    inputColor1: `current application's CIColor's colorWithRed:${redValues[3] / 255} green:${
      greenValues[3] / 255
    } blue:${blueValues[3] / 255} alpha:${alphaValues[3] / 255}`,
    inputCenter: `current application's CIVector's vectorWithX:((random number) * imgWidth) Y:((random number) * imgHeight)`,
    inputRadius0: `((random number) * imgWidth)`,
    inputRadius1: `((random number) * imgWidth)`,
  },
  {
    inputColor0: `current application's CIColor's colorWithRed:${redValues[4] / 255} green:${
      greenValues[4] / 255
    } blue:${blueValues[4] / 255} alpha:${alphaValues[4] / 255}`,
    inputColor1: `current application's CIColor's colorWithRed:${redValues[5] / 255} green:${
      greenValues[5] / 255
    } blue:${blueValues[5] / 255} alpha:${alphaValues[5] / 255}`,
    inputCenter: `current application's CIVector's vectorWithX:((random number) * imgWidth) Y:((random number) * imgHeight)`,
    inputRadius0: `((random number) * imgWidth)`,
    inputRadius1: `((random number) * imgWidth)`,
  },
  {
    inputColor0: `current application's CIColor's colorWithRed:${redValues[6] / 255} green:${
      greenValues[6] / 255
    } blue:${blueValues[6] / 255} alpha:${alphaValues[6] / 255}`,
    inputColor1: `current application's CIColor's colorWithRed:${redValues[7] / 255} green:${
      greenValues[7] / 255
    } blue:${blueValues[7] / 255} alpha:${alphaValues[7] / 255}`,
    inputCenter: `current application's CIVector's vectorWithX:((random number) * imgWidth) Y:((random number) * imgHeight)`,
    inputRadius0: `((random number) * imgWidth)`,
    inputRadius1: `((random number) * imgWidth)`,
  },
  {
    inputColor0: `current application's CIColor's colorWithRed:${redValues[8] / 255} green:${
      greenValues[8] / 255
    } blue:${blueValues[8] / 255} alpha:${alphaValues[8] / 255}`,
    inputColor1: `current application's CIColor's colorWithRed:${redValues[9] / 255} green:${
      greenValues[9] / 255
    } blue:${blueValues[9] / 255} alpha:${alphaValues[9] / 255}`,
    inputCenter: `current application's CIVector's vectorWithX:((random number) * imgWidth) Y:((random number) * imgHeight)`,
    inputRadius0: `((random number) * imgWidth)`,
    inputRadius1: `((random number) * imgWidth)`,
  },
];

export const getStarShineOptions = (
  redValues: number[],
  greenValues: number[],
  blueValues: number[],
  alphaValues: number[],
) => ({
  inputColor: `current application's CIColor's colorWithRed:${redValues[0] / 255} green:${greenValues[0] / 255} blue:${
    blueValues[0] / 255
  } alpha:${alphaValues[0] / 255}`,
  inputCrossScale: `((random number) * 10)`,
  inputCrossAngle: `((random number) * 90)`,
  inputCrossOpacity: `((random number) * 9) - 8`,
  inputCrossWidth: `((random number) * imgWidth / 5)`,
  inputEpsilon: `((random number) * 1)`,
  inputRadius: `((random number) * imgWidth / 10)`,
  inputCenter: `current application's CIVector's vectorWithX:((random number) * imgWidth) Y:((random number) * imgHeight)`,
});

export const getLenticularHaloOptions = (
  redValues: number[],
  greenValues: number[],
  blueValues: number[],
  alphaValues: number[],
) => ({
  inputColor: `current application's CIColor's colorWithRed:${redValues[0] / 255} green:${greenValues[0] / 255} blue:${
    blueValues[0] / 255
  } alpha:${alphaValues[0] / 255}`,
  inputHaloRadius: `((random number) * imgWidth / 10)`,
  inputHaloWidth: `((random number) * imgWidth / 10)`,
  inputStriationStrength: `((random number) * 1)`,
  inputStriationContrast: `((random number) * 5)`,
  inputTime: `((random number) * 10)`,
  inputCenter: `current application's CIVector's vectorWithX:((random number) * imgWidth) Y:((random number) * imgHeight)`,
  inputHaloOverlap: `((random number) * 0.99)`,
});

export const getSunbeamsOptions = (
  redValues: number[],
  greenValues: number[],
  blueValues: number[],
  alphaValues: number[],
) => ({
  inputColor: `current application's CIColor's colorWithRed:${redValues[0] / 255} green:${greenValues[0] / 255} blue:${
    blueValues[0] / 255
  } alpha:${alphaValues[0] / 255}`,
  inputSunRadius: `((random number) * imgWidth / 10)`,
  inputMaxStriationRadius: `((random number) * imgWidth / 10)`,
  inputStriationStrength: `((random number) * 1)`,
  inputStriationContrast: `((random number) * 5)`,
  inputTime: `((random number) * 10)`,
  inputCenter: `current application's CIVector's vectorWithX:((random number) * imgWidth) Y:((random number) * imgHeight)`,
});
