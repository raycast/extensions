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
  thumbnail: string;
}[] = [
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
