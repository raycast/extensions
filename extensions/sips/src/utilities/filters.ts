/**
 * @file utilities/filters.ts
 *
 * @summary Helper functions and resources for applying filters to images and PDFs using Core Image and ASObjC.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-06 00:44:28
 * Last modified  : 2024-06-26 21:37:46
 */

import { runAppleScript } from "@raycast/utils";
import { Filter } from "./types";

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

    set res to ""
    set thePDF to missing value
    applyFilter("${source}", "${destination}")
    on applyFilter(sourcePath, destinationPath)
        global thePDF
        set repeatCount to 1
        if "${source}" ends with ".pdf" and "${destination}" is not "" then
            set thePDF to current application's PDFDocument's alloc()'s initWithURL:(current application's |NSURL|'s fileURLWithPath:sourcePath)
            set pageCount to thePDF's pageCount()
            set repeatCount to pageCount
        end if

        repeat with i from 1 to repeatCount
          if repeatCount > 1 then
            set thePage to thePDF's pageAtIndex:(i - 1)
            set theData to thePage's dataRepresentation()
            set theImage to current application's NSImage's alloc()'s initWithData:theData
          else
            set theImage to current application's NSImage's alloc()'s initWithContentsOfFile:sourcePath
          end if
          
          -- Set up the Filter
          set filterName to "${CIFilterName}"
          set theFilter to current application's CIFilter's filterWithName:filterName
          theFilter's setDefaults()`;
};

/**
 * Second part of the ASObjC script that applies a filter to an image. Applies the filter to the image, crops the result to the original image size, and calls the saveImage() handler.
 */
const baseFilterResultScript = `-- Get result & crop to original image size
    set theBounds to current application's NSMakeRect(0, 0, theImage's |size|()'s width, theImage's |size|()'s height)
    set uncroppedOutput to theFilter's valueForKey:(current application's kCIOutputImageKey)
    set croppedOutput to uncroppedOutput's imageByCroppingToRect:(uncroppedOutput's extent())
    
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
    set theCIImage to current application's CIImage's imageWithData:(theImage's TIFFRepresentation())
    theFilter's setValue:theCIImage forKey:"inputImage"
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
 * @param CIFilterName The name of the CIFilter to apply.
 * @returns A promise that resolves when the script has finished running.
 */
export const applyBasicFilter = async (source: string, destination: string, CIFilterName: string) => {
  return runAppleScript(`${initializeFilterScript(source, destination, CIFilterName)}
          set theCIImage to current application's CIImage's imageWithData:(theImage's TIFFRepresentation())
          theFilter's setValue:theCIImage forKey:"inputImage"
          ${baseFilterResultScript}
        end repeat

        -- Save PDFs
        if "${source}" ends with ".pdf" then
          thePDF's writeToFile:"${destination}"
        end if
    end applyFilter
    ${saveImageScript}`);
};

/**
 * All supported filters.
 */
export const filters: Filter[] = [
  {
    name: "Bloom",
    description: "Softens edges and adds a glow",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIBloom",
    thumbnail: "thumbnails/bloom.webp",
  },
  {
    name: "Bokeh Blur",
    description: "Applies a Bokeh effect",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIBokehBlur",
    thumbnail: "thumbnails/bokeh_blur.webp",
  },
  {
    name: "Box Blur",
    description: "Blur effect using a box-shaped convolution kernel",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIBoxBlur",
    thumbnail: "thumbnails/box_blur.webp",
  },
  {
    name: "Chrome",
    description: "Increase brightness and saturation",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIPhotoEffectChrome",
    thumbnail: "thumbnails/chrome.webp",
  },
  {
    name: "Circular Screen",
    description: "Simulates a circular-shaped halftone screen",
    applyMethod: applyBasicFilter,
    CIFilterName: "CICircularScreen",
    thumbnail: "thumbnails/circular_screen.webp",
  },
  {
    name: "Circular Wrap",
    description: "Wraps an image around a transparent circle",
    applyMethod: applyBasicFilter,
    CIFilterName: "CICircularWrap",
    thumbnail: "thumbnails/circular_wrap.webp",
  },
  {
    name: "CMYK Halftone",
    description: "Creates a halftoned rendition of an image using cyan, magenta, yellow, and black",
    applyMethod: applyBasicFilter,
    CIFilterName: "CICMYKHalftone",
    thumbnail: "thumbnails/cmyk_halftone.webp",
  },
  {
    name: "Comic",
    description: "Makes images look like comic book drawings",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIComicEffect",
    thumbnail: "thumbnails/comic.webp",
  },
  {
    name: "Crystallize",
    description: "Creates polygon-shaped color blocks by aggregating pixel values",
    applyMethod: applyBasicFilter,
    CIFilterName: "CICrystallize",
    thumbnail: "thumbnails/crystallize.webp",
  },
  {
    name: "Depth Of Field",
    description: "Simulates tilt-shift",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIDepthOfField",
    thumbnail: "thumbnails/depth_of_field.webp",
  },
  {
    name: "Disc Blur",
    description: "Blur effect that uses a disc-shaped convolution kernel",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIDiscBlur",
    thumbnail: "thumbnails/disc_blur.webp",
  },
  {
    name: "Dither",
    description: "Adds noise to reduce distortion",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIDither",
    thumbnail: "thumbnails/dither.webp",
  },
  {
    name: "Document Enhancement",
    description: "Removes unwanted shadows, whitens background, and enhances contrast",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIDocumentEnhancer",
    thumbnail: "thumbnails/document_enhancement.webp",
  },
  {
    name: "Dot Screen",
    description: "Simulates the dot pattern of a halftone screen",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIDotScreen",
    thumbnail: "thumbnails/dot_screen.webp",
  },
  {
    name: "Edges",
    description: "Detects edges and highlights them colorfully, blackening other areas",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIEdges",
    thumbnail: "thumbnails/edges.webp",
  },
  {
    name: "Edge Work",
    description: "White woodblock cutout effect",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIEdgeWork",
    thumbnail: "thumbnails/edge_work.webp",
  },
  {
    name: "Fade",
    description: "Decreases saturation",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIPhotoEffectFade",
    thumbnail: "thumbnails/fade.webp",
  },
  {
    name: "Gaussian Blur",
    description: "Blurs the image using a Gaussian filter",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIGaussianBlur",
    thumbnail: "thumbnails/gaussian_blur.webp",
  },
  {
    name: "Gloom",
    description: "Dulls highlights",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIGloom",
    thumbnail: "thumbnails/gloom.webp",
  },
  {
    name: "Hatched Screen",
    description: "Simulates the hatched pattern of a halftone screen",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIHatchedScreen",
    thumbnail: "thumbnails/hatched_screen.webp",
  },
  {
    name: "Hexagonal Pixellate",
    description: "Pixellates images using hexagons",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIHexagonalPixellate",
    thumbnail: "thumbnails/hexagonal_pixellate.webp",
  },
  {
    name: "Instant",
    description: "Decreases saturation, reduces contrast",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIPhotoEffectInstant",
    thumbnail: "thumbnails/instant.webp",
  },
  {
    name: "Invert",
    description: "Inverts colors",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIColorInvert",
    thumbnail: "thumbnails/invert.webp",
  },
  {
    name: "Kaleidoscope",
    description: "Creates a kaleidoscopic image by applying 12-way symmetry",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIKaleidoscope",
    thumbnail: "thumbnails/kaleidoscope.webp",
  },
  {
    name: "Line Overlay",
    description: "Black woodblock cutout effect",
    applyMethod: applyBasicFilter,
    CIFilterName: "CILineOverlay",
    thumbnail: "thumbnails/line_overlay.webp",
  },
  {
    name: "Line Screen",
    description: "Simulates the line pattern of a halftone screen",
    applyMethod: applyBasicFilter,
    CIFilterName: "CILineScreen",
    thumbnail: "thumbnails/line_screen.webp",
  },
  {
    name: "Maximum Component",
    description: "Converts image to grayscale using the maximum of the three color components",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIMaximumComponent",
    thumbnail: "thumbnails/maximum_component.webp",
  },
  {
    name: "Median",
    description: "Reduces noise by calculating median pixel values",
    applyMethod: applyBasicFilter,
    CIFilterName: "CILineOverlay",
    thumbnail: "thumbnails/median.webp",
  },
  {
    name: "Minimum Component",
    description: "Converts image to grayscale using the minimum of the three color components",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIMinimumComponent",
    thumbnail: "thumbnails/minimum_component.webp",
  },
  {
    name: "Mono",
    description: "Desaturates images and reduces contrast",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIPhotoEffectMono",
    thumbnail: "thumbnails/mono.webp",
  },
  {
    name: "Motion Blur",
    description: "Blur effect simulating a camera moving while capturing an image",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIMotionBlur",
    thumbnail: "thumbnails/motion_blur.webp",
  },
  {
    name: "Noir",
    description: "Desaturates images and increases contrast",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIPhotoEffectNoir",
    thumbnail: "thumbnails/noir.webp",
  },
  {
    name: "Noise Reduction",
    description: "Reduces noise by sharpening areas of low luminance",
    applyMethod: applyBasicFilter,
    CIFilterName: "CINoiseReduction",
    thumbnail: "thumbnails/noise_reduction.webp",
  },
  {
    name: "Pixellate",
    description: "Pixellates images with large square pixels",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIPixellate",
    thumbnail: "thumbnails/pixellate.webp",
  },
  {
    name: "Posterize",
    description: "Flattens colors",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIColorPosterize",
    thumbnail: "thumbnails/posterize.webp",
  },
  {
    name: "Pointillize",
    description: "Pixellates images with dots",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIPointillize",
    thumbnail: "thumbnails/pointillize.webp",
  },
  {
    name: "Process",
    description: "Gives images a cooler toner",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIPhotoEffectProcess",
    thumbnail: "thumbnails/process.webp",
  },
  {
    name: "Sepia",
    description: "Maps all colors to shades of brown",
    applyMethod: applyBasicFilter,
    CIFilterName: "CISepiaTone",
    thumbnail: "thumbnails/sepia.webp",
  },
  {
    name: "Sharpen Luminance",
    description: "Increases detailed by sharpening based on luminance",
    applyMethod: applyBasicFilter,
    CIFilterName: "CISharpenLuminance",
    thumbnail: "thumbnails/sharpen_luminance.webp",
  },
  {
    name: "Thermal",
    description: "Thermal camera effect",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIThermal",
    thumbnail: "thumbnails/thermal.webp",
  },
  {
    name: "Tonal",
    description: "Decreases saturation and contrast",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIPhotoEffectTonal",
    thumbnail: "thumbnails/tonal.webp",
  },
  {
    name: "Transfer",
    description: "Makes images warmer",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIPhotoEffectTransfer",
    thumbnail: "thumbnails/transfer.webp",
  },
  {
    name: "Vignette",
    description: "Adds shading to the corners of images",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIVignette",
    thumbnail: "thumbnails/vignette.webp",
  },
  {
    name: "X-Ray",
    description: "X-Ray image effect",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIXRay",
    thumbnail: "thumbnails/x-ray.webp",
  },
  {
    name: "Zoom Blur",
    description: "Blur simulating a camera zooming in while capturing an image",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIZoomBlur",
    thumbnail: "thumbnails/zoom_blur.webp",
  },
];
