import { showToast, Toast } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { getSelectedImages } from "./utils";

const initializeFilterScript = (source: string, destination: string, CIFilterName: string) => {
  return `use framework "Foundation"
    use framework "Quartz"
    applyFilter("${source}", "${destination}")
    on applyFilter(sourcePath, destinationPath)
        set theImage to current application's NSImage's alloc()'s initWithContentsOfFile:sourcePath
        
        -- Set up the Filter
        set filterName to "${CIFilterName}"
        set theFilter to current application's CIFilter's filterWithName:filterName
        theFilter's setDefaults()`;
};

const baseFilterResultScript = `-- Get result & crop to original image size
    set theBounds to current application's NSMakeRect(0, 0, theImage's |size|()'s width, theImage's |size|()'s height)
    set uncroppedOutput to theFilter's valueForKey:(current application's kCIOutputImageKey)
    set croppedOutput to uncroppedOutput's imageByCroppingToRect:(uncroppedOutput's extent())
    
    -- Convert back to NSImage and save to file
    set theRep to current application's NSCIImageRep's imageRepWithCIImage:croppedOutput
    set theResult to current application's NSImage's alloc()'s initWithSize:(theRep's |size|())
    theResult's addRepresentation:theRep
    saveImage(theResult, destinationPath)`;

const saveImageScript = `on saveImage(imageToSave, destinationPath)
    -- Saves an NSImage to the supplied file path
    set theTIFFData to imageToSave's TIFFRepresentation()
    set theBitmapImageRep to current application's NSBitmapImageRep's imageRepWithData:theTIFFData
    set theImageProperties to current application's NSDictionary's dictionaryWithObject:1 forKey:(current application's NSImageCompressionFactor)
    set theResultData to theBitmapImageRep's representationUsingType:(current application's NSPNGFileType) |properties|:(missing value)
    theResultData's writeToFile:destinationPath atomically:false
end saveImage`;

export const applyBasicFilter = async (source: string, destination: string, CIFilterName: string) => {
  return runAppleScript(`${initializeFilterScript(source, destination, CIFilterName)}
        set theCIImage to current application's CIImage's imageWithData:(theImage's TIFFRepresentation())
        theFilter's setValue:theCIImage forKey:"inputImage"
        ${baseFilterResultScript}
    end applyFilter
    ${saveImageScript}`);
};

export const filters: {
  name: string;
  description: string;
  applyMethod: (source: string, destination: string, CIFilterName: string) => Promise<string>;
  CIFilterName: string;
}[] = [
  {
    name: "Bloom",
    description: "Softens edges and adds a glow",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIBloom",
  },
  {
    name: "Bokeh Blur",
    description: "Applies a Bokeh effect",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIBokehBlur",
  },
  {
    name: "Box Blur",
    description: "Blur effect using a box-shaped convolution kernel",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIBoxBlur",
  },
  {
    name: "Chrome",
    description: "Increase brightness and saturation",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIPhotoEffectChrome",
  },
  {
    name: "Circular Screen",
    description: "Simulates a circular-shaped halftone screen",
    applyMethod: applyBasicFilter,
    CIFilterName: "CICircularScreen",
  },
  {
    name: "Circular Wrap",
    description: "Wraps an image around a transparent circle",
    applyMethod: applyBasicFilter,
    CIFilterName: "CICircularWrap",
  },
  {
    name: "CMYK Halftone",
    description: "Creates a halftoned rendition of an image using cyan, magenta, yellow, and black",
    applyMethod: applyBasicFilter,
    CIFilterName: "CICMYKHalftone",
  },
  {
    name: "Comic",
    description: "Makes images look like comic book drawings",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIComicEffect",
  },
  {
    name: "Crystallize",
    description: "Creates polygon-shaped color blocks by aggregating pixel values",
    applyMethod: applyBasicFilter,
    CIFilterName: "CICrystallize",
  },
  {
    name: "Depth Of Field",
    description: "Simulates tilt-shift",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIDepthOfField",
  },
  {
    name: "Disc Blur",
    description: "Blur effect that uses a disc-shaped convolution kernel",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIDiscBlur",
  },
  {
    name: "Dither",
    description: "Adds noise to reduce distortion",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIDither",
  },
  {
    name: "Document Enhancement",
    description: "Removes unwanted shadows, whitens background, and enhances contrast",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIDocumentEnhancer",
  },
  {
    name: "Dot Screen",
    description: "Simulates the dot pattern of a halftone screen",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIDotScreen",
  },
  {
    name: "Edges",
    description: "Detects edges and highlights them colorfully, blackening other areas",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIEdges",
  },
  {
    name: "Edge Work",
    description: "White woodblock cutout effect",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIEdgeWork",
  },
  {
    name: "Fade",
    description: "Decreases saturation",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIPhotoEffectFade",
  },
  {
    name: "Gaussian Blur",
    description: "Blurs the image using a Gaussian filter",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIGaussianBlur",
  },
  {
    name: "Gloom",
    description: "Dulls highlights",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIGloom",
  },
  {
    name: "Hatched Screen",
    description: "Simulates the hatched pattern of a halftone screen",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIHatchedScreen",
  },
  {
    name: "Hexagonal Pixellate",
    description: "Pixellates images using hexagons",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIHexagonalPixellate",
  },
  {
    name: "Instant",
    description: "Decreases saturation, reduces contrast",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIPhotoEffectInstant",
  },
  {
    name: "Invert",
    description: "Inverts colors",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIColorInvert",
  },
  {
    name: "Kaleidoscope",
    description: "Creates a kaleidoscopic image by applying 12-way symmetry",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIKaleidoscope",
  },
  {
    name: "Line Overlay",
    description: "Black woodblock cutout effect",
    applyMethod: applyBasicFilter,
    CIFilterName: "CILineOverlay",
  },
  {
    name: "Line Screen",
    description: "Simulates the line pattern of a halftone screen",
    applyMethod: applyBasicFilter,
    CIFilterName: "CILineScreen",
  },
  {
    name: "Maximum Component",
    description: "Converts image to grayscale using the maximum of the three color components",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIMaximumComponent",
  },
  {
    name: "Median",
    description: "Reduces noise by calculating median pixel values",
    applyMethod: applyBasicFilter,
    CIFilterName: "CILineOverlay",
  },
  {
    name: "Minimum Component",
    description: "Converts image to grayscale using the minimum of the three color components",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIMinimumComponent",
  },
  {
    name: "Mono",
    description: "Desaturates images and reduces contrast",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIPhotoEffectMono",
  },
  {
    name: "Motion Blur",
    description: "Blur effect simulating a camera moving while capturing an image",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIMotionBlur",
  },
  {
    name: "Noir",
    description: "Desaturates images and increases contrast",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIPhotoEffectNoir",
  },
  {
    name: "Noise Reduction",
    description: "Reduces noise by sharpening areas of low luminance",
    applyMethod: applyBasicFilter,
    CIFilterName: "CINoiseReduction",
  },
  {
    name: "Pixellate",
    description: "Pixellates images with large square pixels",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIPixellate",
  },
  {
    name: "Posterize",
    description: "Flattens colors",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIColorPosterize",
  },
  {
    name: "Pointillize",
    description: "Pixellates images with dots",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIPointillize",
  },
  {
    name: "Process",
    description: "Gives images a cooler toner",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIPhotoEffectProcess",
  },
  {
    name: "Sepia",
    description: "Maps all colors to shades of brown",
    applyMethod: applyBasicFilter,
    CIFilterName: "CISepiaTone",
  },
  {
    name: "Sharpen Luminance",
    description: "Increases detailed by sharpening based on luminance",
    applyMethod: applyBasicFilter,
    CIFilterName: "CISharpenLuminance",
  },
  {
    name: "Thermal",
    description: "Thermal camera effect",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIThermal",
  },
  {
    name: "Tonal",
    description: "Decreases saturation and contrast",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIPhotoEffectTonal",
  },
  {
    name: "Transfer",
    description: "Makes images warmer",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIPhotoEffectTransfer",
  },
  {
    name: "Vignette",
    description: "Adds shading to the corners of images",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIVignette",
  },
  {
    name: "X-Ray",
    description: "X-Ray image effect",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIXRay",
  },
  {
    name: "Zoom Blur",
    description: "Blur simulating a camera zooming in while capturing an image",
    applyMethod: applyBasicFilter,
    CIFilterName: "CIZoomBlur",
  },
];

export const applyFilter = async (filter: {
  name: string;
  description: string;
  applyMethod: (source: string, destination: string, CIFilterName: string) => Promise<string>;
  CIFilterName: string;
}) => {
  const selectedImages = await getSelectedImages();

  if (selectedImages.length === 0 || (selectedImages.length === 1 && selectedImages[0] === "")) {
    await showToast({ title: "No images selected", style: Toast.Style.Failure });
    return;
  }

  const toast = await showToast({ title: "Filtering in progress...", style: Toast.Style.Animated });

  const pluralized = `image${selectedImages.length === 1 ? "" : "s"}`;
  try {
    selectedImages.forEach(async (imageFilePath) => {
      const pathComponents = imageFilePath.split(".");
      const newPath = pathComponents.slice(0, -1).join(".") + ".png";
      await filter.applyMethod(imageFilePath, newPath, filter.CIFilterName);
    });
    toast.title = `Applied ${filter.name} Filter To ${selectedImages.length.toString()} ${pluralized}`;
    toast.style = Toast.Style.Success;
  } catch (error) {
    console.log(error);
    toast.title = `Failed To Apply Filter`;
    toast.style = Toast.Style.Failure;
  }
};
