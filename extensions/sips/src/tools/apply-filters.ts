import applyFilter from "../operations/filterOperation";
import { getActiveFilters } from "../utilities/filters";
import { cleanup, getSelectedImages } from "../utilities/utils";

type Input = {
  /**
   * The names of each filter to apply. List one or more filters to best match the user's request. Keep the list under 5 filters unless the user specifically requests more.
   */
  filters: (
    | "Bokeh Blur"
    | "Box Blur"
    | "Disc Blur"
    | "Gaussian Blur"
    | "Median"
    | "Motion Blur"
    | "Noise Reduction"
    | "Zoom Blur"
    | "Chrome"
    | "Dither"
    | "Document Enhancement"
    | "Fade"
    | "Instant"
    | "Invert"
    | "Maximum Component"
    | "Minimum Component"
    | "Mono"
    | "Noir"
    | "Posterize"
    | "Process"
    | "Sepia"
    | "Thermal"
    | "Tonal"
    | "Transfer"
    | "Vignette"
    | "X-Ray"
    | "Circular Screen"
    | "Dot Screen"
    | "CMYK Halftone"
    | "Hatched Screen"
    | "Line Screen"
    | "Bump"
    | "Circle Splash"
    | "Circular Wrap"
    | "Droste"
    | "Glass Lozenge"
    | "Hole"
    | "Light Tunnel"
    | "Linear Bump"
    | "Pinch"
    | "Torus Lens"
    | "Twirl"
    | "Vortex"
    | "Sharpen Luminance"
    | "Unsharp Mask"
    | "Bloom"
    | "Comic"
    | "Crystallize"
    | "Depth Of Field"
    | "Edges"
    | "Edge Work"
    | "Gabor Gradients"
    | "Gloom"
    | "Height Field From Mask"
    | "Hexagonal Pixellate"
    | "Line Overlay"
    | "Pixellate"
    | "Pointillize"
    | "Spotlight"
    | "Eightfold Reflected Tile"
    | "Fourfold Reflected Tile"
    | "Fourfold Rotated Tile"
    | "Fourfold Translated Tile"
    | "Glide Reflected Tile"
    | "Kaleidoscope"
    | "Op Tile"
    | "Parallelogram Tile"
    | "Perspective Tile"
    | "Sixfold Reflected Tile"
    | "Sixfold Rotated Tile"
    | "Triangle Kaleidoscope"
    | "Triangle Tile"
    | "Twelvefold Reflected Tile"
  )[];

  /**
   * Optional array of image paths to process. If not provided, will attempt to get selected images from Finder.
   */
  imagePaths?: string[];
};

export default async function ({ filters, imagePaths }: Input) {
  let selectedImages = imagePaths?.length ? imagePaths : await getSelectedImages();

  const filterObjs = filters.map((filter) => getActiveFilters().find((f) => f.name === filter));

  let resultPaths = new Array<string>();
  for (const filterObj of filterObjs) {
    if (!filterObj) {
      throw new Error(`Filter "${filterObj}" not found.`);
    }

    selectedImages = resultPaths?.length ? resultPaths : selectedImages;
    resultPaths = await applyFilter(selectedImages, filterObj);
  }
  await cleanup();
  return resultPaths;
}
