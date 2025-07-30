/**
 * @file utilities/filters.ts
 *
 * @summary Helper functions and resources for applying filters to images and PDFs using Core Image and ASObjC.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-06 00:44:28
 */

import { runAppleScript } from "@raycast/utils";
import { Filter, FilterCategory } from "./types";
import { getPreferenceValues } from "@raycast/api";

/**
 * First part of the ASObjC script that applies a filter to an image. Initializes the filter and sets its default values. Initializes the image or PDF document to apply the filter to.
 *
 * @param source The path to the image or PDF document to apply the filter to.
 * @param destination The path to output the filtered image or PDF document.
 * @param CIFilterName The name of the CIFilter to apply.
 * @returns The beginning of an ASObjC script with filled-in parameters.
 */
const initializeFilterScript = (source: string, destination: string, CIFilterName: string) => {
  return `use framework "Foundation"
    use framework "Quartz"
    use framework "PDFKit"
    use scripting additions

    on getTrueSize(image)
      set rep to image's representations()'s objectAtIndex:0
      set imageSize to current application's NSMakeSize(rep's pixelsWide, rep's pixelsHigh)
      return imageSize as record
    end getTrueSize

    set res to ""
    set thePDF to missing value

    applyFilter("${source}", "${destination}")
    on applyFilter(sourcePath, destinationPath)
        global thePDF
        set repeatCount to 1
        if "${source}" ends with ".pdf" then
            set thePDF to current application's PDFDocument's alloc()'s initWithURL:(current application's |NSURL|'s fileURLWithPath:sourcePath)
            set pageCount to thePDF's pageCount()
            set repeatCount to pageCount
        end if

        repeat with i from 1 to repeatCount
          if thePDF is not missing value then
            set thePage to thePDF's pageAtIndex:(i - 1)
            set theData to thePage's dataRepresentation()
            set theImage to current application's NSImage's alloc()'s initWithData:theData
          else
            set theImage to current application's NSImage's alloc()'s initWithContentsOfFile:sourcePath
          end if

          set imgSize to getTrueSize(theImage)
          
          -- Set up the Filter
          set filterName to "${CIFilterName}"
          set theFilter to current application's CIFilter's filterWithName:filterName
          theFilter's setDefaults()`;
};

/**
 * Second part of the ASObjC script that applies a filter to an image. Applies the filter to the image, crops the result to the original image size, and calls the saveImage() handler.
 */
const baseFilterResultScript = `-- Get result & crop to original image size
    set theBounds to current application's NSMakeRect(0, 0, imgSize's width, imgSize's height)
    set uncroppedOutput to theFilter's valueForKey:(current application's kCIOutputImageKey)
    set croppedOutput to uncroppedOutput's imageByCroppingToRect:(uncroppedOutput's extent())
    
    -- Detect if output is an infinite image, bound it to the original image size
    if item 1 of (item 2 of uncroppedOutput's extent()) > 100000 or item 2 of (item 2 of uncroppedOutput's extent()) > 100000 then
      set croppedOutput to uncroppedOutput's imageByCroppingToRect:theBounds
    end if
    
    -- Convert back to NSImage and save to file
    set theRep to current application's NSCIImageRep's imageRepWithCIImage:croppedOutput
    set theResult to current application's NSImage's alloc()'s initWithSize:(theRep's |size|())
    theResult's addRepresentation:theRep
    saveImage(theResult, sourcePath, destinationPath, i)`;

/**
 * Third part of the ASObjC script that applies a filter to an image. Saves the filtered image to the destination path. Iteratively converts a PDF document to filtered images.
 */
const saveImageScript = `on saveImage(imageToSave, sourcePath, destinationPath, iter)
    global thePDF
    if destinationPath ends with ".pdf" then
      -- Replaces the contents of a PDF page with the supplied NSImage
      set newPage to current application's PDFPage's alloc()'s initWithImage:imageToSave
      thePDF's removePageAtIndex:(iter - 1)
      thePDF's insertPage:newPage atIndex:(iter - 1)
    else
      -- Saves an NSImage to the supplied file path
      set theTIFFData to imageToSave's TIFFRepresentation()
      set theBitmapImageRep to current application's NSBitmapImageRep's imageRepWithData:theTIFFData
      set theImageProperties to current application's NSDictionary's dictionaryWithObject:1 forKey:(current application's NSImageCompressionFactor)
      set theResultData to theBitmapImageRep's representationUsingType:(current application's NSPNGFileType) |properties|:(missing value)
      theResultData's writeToFile:destinationPath atomically:false
    end if
end saveImage`;

export const getFilterThumbnail = async (filter: Filter, source: string) => {
  return runAppleScript(`${initializeFilterScript(source, "", filter.CIFilterName)}
    set newWidth to 300

    try
      set scaleFactor to newWidth / (imgSize's width)
    on error
      set scaleFactor to 1
    end try

    set imgSize to current application's NSMakeSize(newWidth, (imgSize's height) * scaleFactor)

    set theCIImage to current application's CIImage's imageWithData:(theImage's TIFFRepresentation())
    set transform to current application's CGAffineTransformMakeScale(scaleFactor, scaleFactor)
    set smallImage to theCIImage's imageByApplyingTransform:transform highQualityDownsample:false

    theFilter's setValue:smallImage forKey:"inputImage"
    ${
      filter.presets
        ? Object.entries(filter.presets)
            .map(([key, value]) => `theFilter's setValue:${value} forKey:"${key}"`)
            .join("\n")
        : ""
    }
    ${baseFilterResultScript}
  end repeat
  end applyFilter
  
  on saveImage(imageToSave, sourcePath, destinationPath, iter)
       global res
        -- Saves an NSImage to the supplied file path
        set theTIFFData to imageToSave's TIFFRepresentation()
        set theBitmapImageRep to current application's NSBitmapImageRep's imageRepWithData:theTIFFData
        set theImageProperties to current application's NSDictionary's dictionaryWithObject:1 forKey:(current application's NSImageCompressionFactor)
        set theResultData to theBitmapImageRep's representationUsingType:(current application's NSPNGFileType) |properties|:(missing value)
        set base64String to (theResultData's base64EncodedStringWithOptions:0) as text
        set res to "data:image/png;base64," & base64String
  end saveImage
  
  return res`);
};

/**
 * The concluding part of the ASObjC script that applies a filter to an image. Joins all the parts of the script together and runs it.
 *
 * @param source The path to the image or PDF document to apply the filter to.
 * @param destination The path to output the filtered image or PDF document.
 * @param filter The filter to apply to the image.
 * @returns A promise that resolves when the script has finished running.
 */
export const applyBasicFilter = async (source: string, destination: string, filter: Filter) => {
  return runAppleScript(`${initializeFilterScript(source, destination, filter.CIFilterName)}
          set theCIImage to current application's CIImage's imageWithData:(theImage's TIFFRepresentation())
          theFilter's setValue:theCIImage forKey:"inputImage"
          ${
            filter.presets
              ? Object.entries(filter.presets)
                  .map(([key, value]) => `theFilter's setValue:${value} forKey:"${key}"`)
                  .join("\n")
              : ""
          }
          ${baseFilterResultScript}
        end repeat

        -- Save PDFs
        if "${source}" ends with ".pdf" then
          thePDF's writeToFile:"${destination}"
        end if
    end applyFilter
    ${saveImageScript}`);
};

export const getActiveFilters = (): Filter[] => {
  const preferences = getPreferenceValues<Preferences.ApplyFilter>();
  const activeFilters = [];
  if ((preferences.hiddenFilters || "").trim().length > 0) {
    const hiddenFilters = preferences.hiddenFilters.split(",").map((filter) => filter.trim());
    if (!hiddenFilters.includes("Blur")) {
      activeFilters.push(...blurFilters);
    }
    if (!hiddenFilters.includes("Color Effect")) {
      activeFilters.push(...colorEffectFilters);
    }
    if (!hiddenFilters.includes("Halftone")) {
      activeFilters.push(...halftoneFilters);
    }
    if (!hiddenFilters.includes("Distortion")) {
      activeFilters.push(...distortionFilters);
    }
    if (!hiddenFilters.includes("Sharpen")) {
      activeFilters.push(...sharpenFilters);
    }
    if (!hiddenFilters.includes("Style")) {
      activeFilters.push(...stylizeFilters);
    }
    if (!hiddenFilters.includes("Tile")) {
      activeFilters.push(...tileFilters);
    }
    return activeFilters.filter((filter) => !hiddenFilters.includes(filter.name));
  }
  return [
    ...blurFilters,
    ...colorEffectFilters,
    ...halftoneFilters,
    ...distortionFilters,
    ...sharpenFilters,
    ...stylizeFilters,
    ...tileFilters,
  ];
};

export const blurFilters: Filter[] = [
  {
    name: "Bokeh Blur",
    description: "Applies a Bokeh effect",
    CIFilterName: "CIBokehBlur",
    thumbnail: "thumbnails/bokeh_blur.webp",
    category: FilterCategory.blur,
  },
  {
    name: "Box Blur",
    description: "Blur effect using a box-shaped convolution kernel",
    CIFilterName: "CIBoxBlur",
    thumbnail: "thumbnails/box_blur.webp",
    category: FilterCategory.blur,
  },
  {
    name: "Disc Blur",
    description: "Blur effect that uses a disc-shaped convolution kernel",
    CIFilterName: "CIDiscBlur",
    thumbnail: "thumbnails/disc_blur.webp",
    category: FilterCategory.blur,
  },
  {
    name: "Gaussian Blur",
    description: "Blurs the image using a Gaussian filter",
    CIFilterName: "CIGaussianBlur",
    thumbnail: "thumbnails/gaussian_blur.webp",
    category: FilterCategory.blur,
  },
  {
    name: "Median",
    description: "Reduces noise by calculating median pixel values",
    CIFilterName: "CIMedianFilter",
    thumbnail: "thumbnails/median.webp",
    category: FilterCategory.blur,
  },
  {
    name: "Motion Blur",
    description: "Blur effect simulating a camera moving while capturing an image",
    CIFilterName: "CIMotionBlur",
    thumbnail: "thumbnails/motion_blur.webp",
    category: FilterCategory.blur,
  },
  {
    name: "Noise Reduction",
    description: "Reduces noise by sharpening areas of low luminance",
    CIFilterName: "CINoiseReduction",
    thumbnail: "thumbnails/noise_reduction.webp",
    category: FilterCategory.blur,
  },
  {
    name: "Zoom Blur",
    description: "Blur simulating a camera zooming in while capturing an image",
    CIFilterName: "CIZoomBlur",
    thumbnail: "thumbnails/zoom_blur.webp",
    category: FilterCategory.blur,
  },
];

export const colorEffectFilters: Filter[] = [
  {
    name: "Chrome",
    description: "Increase brightness and saturation",
    CIFilterName: "CIPhotoEffectChrome",
    thumbnail: "thumbnails/chrome.webp",
    category: FilterCategory.colorEffect,
  },
  {
    name: "Dither",
    description: "Adds noise to reduce distortion",
    CIFilterName: "CIDither",
    thumbnail: "thumbnails/dither.webp",
    category: FilterCategory.colorEffect,
  },
  {
    name: "Document Enhancement",
    description: "Removes unwanted shadows, whitens background, and enhances contrast",
    CIFilterName: "CIDocumentEnhancer",
    thumbnail: "thumbnails/document_enhancement.webp",
    category: FilterCategory.colorEffect,
  },
  {
    name: "Fade",
    description: "Decreases saturation",
    CIFilterName: "CIPhotoEffectFade",
    thumbnail: "thumbnails/fade.webp",
    category: FilterCategory.colorEffect,
  },
  {
    name: "Instant",
    description: "Decreases saturation, reduces contrast",
    CIFilterName: "CIPhotoEffectInstant",
    thumbnail: "thumbnails/instant.webp",
    category: FilterCategory.colorEffect,
  },
  {
    name: "Invert",
    description: "Inverts colors",
    CIFilterName: "CIColorInvert",
    thumbnail: "thumbnails/invert.webp",
    category: FilterCategory.colorEffect,
  },
  {
    name: "Maximum Component",
    description: "Converts image to grayscale using the maximum of the three color components",
    CIFilterName: "CIMaximumComponent",
    thumbnail: "thumbnails/maximum_component.webp",
    category: FilterCategory.colorEffect,
  },

  {
    name: "Minimum Component",
    description: "Converts image to grayscale using the minimum of the three color components",
    CIFilterName: "CIMinimumComponent",
    thumbnail: "thumbnails/minimum_component.webp",
    category: FilterCategory.colorEffect,
  },
  {
    name: "Mono",
    description: "Desaturates images and reduces contrast",
    CIFilterName: "CIPhotoEffectMono",
    thumbnail: "thumbnails/mono.webp",
    category: FilterCategory.colorEffect,
  },
  {
    name: "Noir",
    description: "Desaturates images and increases contrast",
    CIFilterName: "CIPhotoEffectNoir",
    thumbnail: "thumbnails/noir.webp",
    category: FilterCategory.colorEffect,
  },
  {
    name: "Posterize",
    description: "Flattens colors",
    CIFilterName: "CIColorPosterize",
    thumbnail: "thumbnails/posterize.webp",
    category: FilterCategory.colorEffect,
  },
  {
    name: "Process",
    description: "Gives images a cooler toner",
    CIFilterName: "CIPhotoEffectProcess",
    thumbnail: "thumbnails/process.webp",
    category: FilterCategory.colorEffect,
  },
  {
    name: "Sepia",
    description: "Maps all colors to shades of brown",
    CIFilterName: "CISepiaTone",
    thumbnail: "thumbnails/sepia.webp",
    category: FilterCategory.colorEffect,
  },
  {
    name: "Thermal",
    description: "Thermal camera effect",
    CIFilterName: "CIThermal",
    thumbnail: "thumbnails/thermal.webp",
    category: FilterCategory.colorEffect,
  },
  {
    name: "Tonal",
    description: "Decreases saturation and contrast",
    CIFilterName: "CIPhotoEffectTonal",
    thumbnail: "thumbnails/tonal.webp",
    category: FilterCategory.colorEffect,
  },
  {
    name: "Transfer",
    description: "Makes images warmer",
    CIFilterName: "CIPhotoEffectTransfer",
    thumbnail: "thumbnails/transfer.webp",
    category: FilterCategory.colorEffect,
  },
  {
    name: "Vignette",
    description: "Adds shading to the corners of images",
    CIFilterName: "CIVignette",
    thumbnail: "thumbnails/vignette.webp",
    category: FilterCategory.colorEffect,
    presets: {
      inputIntensity: 1.0,
      inputRadius: `(imgSize's width / 2)`,
    },
  },
  {
    name: "X-Ray",
    description: "X-Ray image effect",
    CIFilterName: "CIXRay",
    thumbnail: "thumbnails/x-ray.webp",
    category: FilterCategory.colorEffect,
  },
];

export const halftoneFilters: Filter[] = [
  {
    name: "Circular Screen",
    description: "Simulates a circular-shaped halftone screen",
    CIFilterName: "CICircularScreen",
    thumbnail: "thumbnails/circular_screen.webp",
    category: FilterCategory.halftone,
  },
  {
    name: "Dot Screen",
    description: "Simulates the dot pattern of a halftone screen",
    CIFilterName: "CIDotScreen",
    thumbnail: "thumbnails/dot_screen.webp",
    category: FilterCategory.halftone,
  },
  {
    name: "CMYK Halftone",
    description: "Creates a halftoned rendition of an image using cyan, magenta, yellow, and black",
    CIFilterName: "CICMYKHalftone",
    thumbnail: "thumbnails/cmyk_halftone.webp",
    category: FilterCategory.halftone,
  },
  {
    name: "Hatched Screen",
    description: "Simulates the hatched pattern of a halftone screen",
    CIFilterName: "CIHatchedScreen",
    thumbnail: "thumbnails/hatched_screen.webp",
    category: FilterCategory.halftone,
  },
  {
    name: "Line Screen",
    description: "Simulates the line pattern of a halftone screen",
    CIFilterName: "CILineScreen",
    thumbnail: "thumbnails/line_screen.webp",
    category: FilterCategory.halftone,
  },
];

export const distortionFilters: Filter[] = [
  {
    name: "Bump",
    description: "Creates a bump that originates from a point",
    CIFilterName: "CIBumpDistortion",
    thumbnail: "thumbnails/bump.webp",
    category: FilterCategory.distortion,
    presets: {
      inputCenter: `(current application's CIVector's vectorWithString:"[" & imgSize's width / 2 & " " & imgSize's height / 2 & "]")`,
      inputRadius: `(imgSize's width / 3)`,
    },
  },
  {
    name: "Circle Splash",
    description: "Radially replicates colors around a center circle",
    CIFilterName: "CICircleSplashDistortion",
    thumbnail: "thumbnails/circle_splash.webp",
    category: FilterCategory.distortion,
    presets: {
      inputCenter: `(current application's CIVector's vectorWithString:"[" & imgSize's width / 2 & " " & imgSize's height / 2 & "]")`,
      inputRadius: `(imgSize's width / 4)`,
    },
  },
  {
    name: "Circular Wrap",
    description: "Wraps an image around a transparent circle",
    CIFilterName: "CICircularWrap",
    thumbnail: "thumbnails/circular_wrap.webp",
    category: FilterCategory.distortion,
  },
  {
    name: "Droste",
    description: "Creates a recursive, M.C. Escher-like effect",
    CIFilterName: "CIDroste",
    thumbnail: "thumbnails/droste.webp",
    category: FilterCategory.distortion,
    presets: {
      inputInsetPoint0: `(current application's CIVector's vectorWithString:"[" & imgSize's width * 1 / 10 & " " & imgSize's height * 9 / 10 & "]")`,
      inputInsetPoint1: `(current application's CIVector's vectorWithString:"[" & imgSize's width * 9 / 10 & " " & imgSize's height * 1 / 10 & "]")`,
      inputPeriodicity: 0,
    },
  },
  {
    name: "Glass Lozenge",
    description: "Distorts a portion of the image around lozenge-shaped lens",
    CIFilterName: "CIGlassLozenge",
    thumbnail: "thumbnails/glass_lozenge.webp",
    category: FilterCategory.distortion,
    presets: {
      inputPoint0: `(current application's CIVector's vectorWithString:"[" & imgSize's width / 1.5 & " " & imgSize's height / 2 & "]")`,
      inputPoint1: `(current application's CIVector's vectorWithString:"[" & imgSize's width / 3 & " " & imgSize's height / 2 & "]")`,
      inputRadius: `(imgSize's width / 4)`,
    },
  },
  {
    name: "Hole",
    description: "Creates a hole in the image, pushing the surrounding pixels outward",
    CIFilterName: "CIHoleDistortion",
    thumbnail: "thumbnails/hole.webp",
    category: FilterCategory.distortion,
    presets: {
      inputCenter: `(current application's CIVector's vectorWithString:"[" & imgSize's width / 2 & " " & imgSize's height / 2 & "]")`,
      inputRadius: `(imgSize's width / 4)`,
    },
  },
  {
    name: "Light Tunnel",
    description: "Rotates the image around a center area to create tunneling effect",
    CIFilterName: "CILightTunnel",
    thumbnail: "thumbnails/light_tunnel.webp",
    category: FilterCategory.distortion,
    presets: {
      inputCenter: `(current application's CIVector's vectorWithString:"[" & imgSize's width / 2 & " " & imgSize's height / 2 & "]")`,
      inputRotation: 3 * Math.PI,
      inputRadius: `(imgSize's width / 4)`,
    },
  },
  {
    name: "Linear Bump",
    description: "Creates a bump that originates from a line",
    CIFilterName: "CIBumpDistortionLinear",
    thumbnail: "thumbnails/linear_bump.webp",
    category: FilterCategory.distortion,
    presets: {
      inputCenter: `(current application's CIVector's vectorWithString:"[" & imgSize's width / 2 & " " & imgSize's height / 2 & "]")`,
      inputRadius: `(imgSize's width / 3)`,
      inputAngle: Math.PI / 2,
    },
  },
  {
    name: "Pinch",
    description: "Distorts an image by pinching it at a point",
    CIFilterName: "CIPinchDistortion",
    thumbnail: "thumbnails/pinch.webp",
    category: FilterCategory.distortion,
    presets: {
      inputCenter: `(current application's CIVector's vectorWithString:"[" & imgSize's width / 2 & " " & imgSize's height / 2 & "]")`,
      inputRadius: `(imgSize's width / 2)`,
    },
  },
  {
    name: "Torus Lens",
    description: "Distorts a portion on an image around a torus-shaped lens",
    CIFilterName: "CITorusLensDistortion",
    thumbnail: "thumbnails/torus_lens.webp",
    category: FilterCategory.distortion,
    presets: {
      inputCenter: `(current application's CIVector's vectorWithString:"[" & imgSize's width / 2 & " " & imgSize's height / 2 & "]")`,
      inputRadius: `(imgSize's width / 2)`,
      inputWidth: `(imgSize's width / 10)`,
    },
  },
  {
    name: "Twirl",
    description: "Rotates pixels around a point to create a twirl effect",
    CIFilterName: "CITwirlDistortion",
    thumbnail: "thumbnails/twirl.webp",
    category: FilterCategory.distortion,
    presets: {
      inputCenter: `(current application's CIVector's vectorWithString:"[" & imgSize's width / 2 & " " & imgSize's height / 2 & "]")`,
      inputRadius: `(imgSize's width / 2)`,
      inputAngle: `(imgSize's width / 100) * ` + Math.PI,
    },
  },
  {
    name: "Vortex",
    description: "Rotates pixels around a point to create a vortex effect",
    CIFilterName: "CIVortexDistortion",
    thumbnail: "thumbnails/vortex.webp",
    category: FilterCategory.distortion,
    presets: {
      inputCenter: `(current application's CIVector's vectorWithString:"[" & imgSize's width / 2 & " " & imgSize's height / 2 & "]")`,
      inputRadius: `(imgSize's width / 2)`,
      inputAngle: `(imgSize's width / 10) * ` + Math.PI,
    },
  },
];

export const sharpenFilters: Filter[] = [
  {
    name: "Sharpen Luminance",
    description: "Increases detailed by sharpening based on luminance",
    CIFilterName: "CISharpenLuminance",
    thumbnail: "thumbnails/sharpen_luminance.webp",
    category: FilterCategory.sharpen,
  },
  {
    name: "Unsharp Mask",
    description: "Sharpens images by increasing contrast along edges",
    CIFilterName: "CIUnsharpMask",
    thumbnail: "thumbnails/unsharp_mask.webp",
    category: FilterCategory.sharpen,
  },
];

export const stylizeFilters: Filter[] = [
  {
    name: "Bloom",
    description: "Softens edges and adds a glow",
    CIFilterName: "CIBloom",
    thumbnail: "thumbnails/bloom.webp",
    category: FilterCategory.stylize,
  },
  {
    name: "Comic",
    description: "Makes images look like comic book drawings",
    CIFilterName: "CIComicEffect",
    thumbnail: "thumbnails/comic.webp",
    category: FilterCategory.stylize,
  },
  {
    name: "Crystallize",
    description: "Creates polygon-shaped color blocks by aggregating pixel values",
    CIFilterName: "CICrystallize",
    thumbnail: "thumbnails/crystallize.webp",
    category: FilterCategory.stylize,
  },
  {
    name: "Depth Of Field",
    description: "Simulates tilt-shift",
    CIFilterName: "CIDepthOfField",
    thumbnail: "thumbnails/depth_of_field.webp",
    category: FilterCategory.stylize,
  },
  {
    name: "Edges",
    description: "Detects edges and highlights them colorfully, blackening other areas",
    CIFilterName: "CIEdges",
    thumbnail: "thumbnails/edges.webp",
    category: FilterCategory.stylize,
  },
  {
    name: "Edge Work",
    description: "White woodblock cutout effect",
    CIFilterName: "CIEdgeWork",
    thumbnail: "thumbnails/edge_work.webp",
    category: FilterCategory.stylize,
  },
  {
    name: "Gabor Gradients",
    description: "Applies a 5x5 Gabor filter to an image",
    CIFilterName: "CIGaborGradients",
    thumbnail: "thumbnails/gabor_gradients.webp",
    category: FilterCategory.stylize,
  },
  {
    name: "Gloom",
    description: "Dulls highlights",
    CIFilterName: "CIGloom",
    thumbnail: "thumbnails/gloom.webp",
    category: FilterCategory.stylize,
  },
  {
    name: "Height Field From Mask",
    description: "Generates a 3D height field from a grayscale mask",
    CIFilterName: "CIHeightFieldFromMask",
    thumbnail: "thumbnails/height_field_from_mask.webp",
    category: FilterCategory.stylize,
  },
  {
    name: "Hexagonal Pixellate",
    description: "Pixellates images using hexagons",
    CIFilterName: "CIHexagonalPixellate",
    thumbnail: "thumbnails/hexagonal_pixellate.webp",
    category: FilterCategory.stylize,
  },
  {
    name: "Line Overlay",
    description: "Black woodblock cutout effect",
    CIFilterName: "CILineOverlay",
    thumbnail: "thumbnails/line_overlay.webp",
    category: FilterCategory.stylize,
  },
  {
    name: "Pixellate",
    description: "Pixellates images with large square pixels",
    CIFilterName: "CIPixellate",
    thumbnail: "thumbnails/pixellate.webp",
    category: FilterCategory.stylize,
  },
  {
    name: "Pointillize",
    description: "Pixellates images with dots",
    CIFilterName: "CIPointillize",
    thumbnail: "thumbnails/pointillize.webp",
    category: FilterCategory.stylize,
  },
  {
    name: "Spotlight",
    description: "Adds a directional spotlight effect",
    CIFilterName: "CISpotLight",
    thumbnail: "thumbnails/spotlight.webp",
    category: FilterCategory.stylize,
    presets: {
      inputLightPointsAt: `(current application's CIVector's vectorWithString:"[" & imgSize's width / 2 & " " & imgSize's height / 2 & " 0]")`,
      inputLightPosition: `(current application's CIVector's vectorWithString:"[" & imgSize's width / 2 & " " & imgSize's height / 2 & " 1000]")`,
      inputBrightness: 5.0,
      inputConcentration: 0.1,
    },
  },
];

export const tileFilters: Filter[] = [
  {
    name: "Eightfold Reflected Tile",
    description: "Tiles an image by applyng an 8-way reflection",
    CIFilterName: "CIEightfoldReflectedTile",
    thumbnail: "thumbnails/eightfold_reflected_tile.webp",
    category: FilterCategory.tile,
  },
  {
    name: "Fourfold Reflected Tile",
    description: "Tiles an image by applying a 4-way reflection",
    CIFilterName: "CIFourfoldReflectedTile",
    thumbnail: "thumbnails/fourfold_reflected_tile.webp",
    category: FilterCategory.tile,
  },
  {
    name: "Fourfold Rotated Tile",
    description: "Tiles an image by rotating it at increments of 90 degrees",
    CIFilterName: "CIFourfoldRotatedTile",
    thumbnail: "thumbnails/fourfold_rotated_tile.webp",
    category: FilterCategory.tile,
  },
  {
    name: "Fourfold Translated Tile",
    description: "Tiles an image by applying a 4 translation operations",
    CIFilterName: "CIFourfoldTranslatedTile",
    thumbnail: "thumbnails/fourfold_translated_tile.webp",
    category: FilterCategory.tile,
  },
  {
    name: "Glide Reflected Tile",
    description: "Tiles an image by translating and smearing it",
    CIFilterName: "CIGlideReflectedTile",
    thumbnail: "thumbnails/glide_reflected_tile.webp",
    category: FilterCategory.tile,
  },
  {
    name: "Kaleidoscope",
    description: "Creates a kaleidoscopic image by applying 12-way symmetry",
    CIFilterName: "CIKaleidoscope",
    thumbnail: "thumbnails/kaleidoscope.webp",
    category: FilterCategory.tile,
  },
  {
    name: "Op Tile",
    description: "Segments and re-assembles images to mimic op art",
    CIFilterName: "CIOpTile",
    thumbnail: "thumbnails/op_tile.webp",
    category: FilterCategory.tile,
  },
  {
    name: "Parallelogram Tile",
    description: "Tiles an image after reflecting it in a parallelogram",
    CIFilterName: "CIParallelogramTile",
    thumbnail: "thumbnails/parallelogram_tile.webp",
    category: FilterCategory.tile,
  },
  {
    name: "Perspective Tile",
    description: "Applies a perspective transformation to an image and tiles the result",
    CIFilterName: "CIPerspectiveTile",
    thumbnail: "thumbnails/perspective_tile.webp",
    category: FilterCategory.tile,
  },
  {
    name: "Sixfold Reflected Tile",
    description: "Tiles an image by applying a 6-way reflection",
    CIFilterName: "CISixfoldReflectedTile",
    thumbnail: "thumbnails/sixfold_reflected_tile.webp",
    category: FilterCategory.tile,
  },
  {
    name: "Sixfold Rotated Tile",
    description: "Tiles an image by rotating it at increments of 60 degrees",
    CIFilterName: "CISixfoldRotatedTile",
    thumbnail: "thumbnails/sixfold_rotated_tile.webp",
    category: FilterCategory.tile,
  },
  {
    name: "Triangle Kaleidoscope",
    description: "Maps a triangular portion of an image to a kaleidoscopically tiled pattern",
    CIFilterName: "CITriangleKaleidoscope",
    thumbnail: "thumbnails/triangle_kaleidoscope.webp",
    category: FilterCategory.tile,
  },
  {
    name: "Triangle Tile",
    description: "Tiles a triangular portion of an image",
    CIFilterName: "CITriangleTile",
    thumbnail: "thumbnails/triangle_tile.webp",
    category: FilterCategory.tile,
  },
  {
    name: "Twelvefold Reflected Tile",
    description: "Tiles an image by applying a 12-way reflection",
    CIFilterName: "CITwelvefoldReflectedTile",
    thumbnail: "thumbnails/twelvefold_reflected_tile.webp",
    category: FilterCategory.tile,
  },
];
