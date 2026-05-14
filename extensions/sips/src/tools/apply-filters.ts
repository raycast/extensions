import applyFilter from "../operations/filterOperation";
import { getActiveFilters } from "../utilities/filters";
import { cleanup, getSelectedImages } from "../utilities/utils";

type Input = {
  /**
   * The names of each filter to apply. List one or more valid filters to best match the user's request. Keep the list under 5 filters unless the user specifically requests more. You must use the full name of the filter. For example, to increase the contrast of an image, use "Process" instead of "Contrast". To make an image greyscale, use "Tonal" instead of "Greyscale".
   *
   * The available filters and their descriptions are:
   * - Blur Filters:
   *  - Bokeh Blur: Simulates an out-of-focus effect.
   *  - Box Blur: Blurs by averaging neighboring pixels.
   *  - Disc Blur: Circular blur that is stronger than Box Blur.
   *  - Gaussian Blur: A smooth blur without the out-of-focus distortions of Bokeh Blur.
   *  - Median: Reduces noise; minimal blurring effect (use only for noise reduction).
   *  - Motion Blur: Simulates the effect of capturing a photo while the camera is moving.
   *  - Noise Reduction: Reduces noise in the image; minimal blurring effect (use only for noise reduction).
   *  - Zoom Blur: Simulates the effect of zooming in or out while taking a photo.
   *
   * - Color Adjustment Filters:
   *   - Chrome: Increases contrast and saturation.
   *   - Dither: Reduces color banding by adding noise.
   *   - Document Enhancement: Sharpens edges, enhances text, brightens light areas, darkens dark areas.
   *   - Fade: Reduces contrast and saturation, adds slight noise.
   *   - Instant: Simulates the look of instant film.
   *   - Invert: Inverts the colors.
   *   - Maximum Component: Applies a greyscale effect by using the maximum RGB component of each pixel.
   *   - Minimum Component: Applies a greyscale effect by using the minimum RGB component of each pixel.
   *   - Mono: Converts images to greyscale; brighter than Minimum Component but darker than Maximum Component.
   *   - Noir: Applies a high-contrast black-and-white effect. Darker than Minimum Component.
   *   - Posterize: Reduces the number of colors, creating a poster-like effect.
   *   - Process: Increases contrast, lightens light areas, and applies a blue tint.
   *   - Sepia: Applies a warm, brownish tint.
   *   - Thermal: Applies a thermal imaging effect.
   *   - Tonal: Converts images to greyscale; reduces contrast; brighter than Noir but darker than Mono.
   *   - Transfer: Simulates the look of a Polaroid transfer, with a soft, washed-out effect.
   *   - Vignette: Darkens the edges and corners of images.
   *   - X-Ray: Simulates the look of an X-ray image.
   *
   * - Distortion Filters:
   *   - Circular Screen: Creates a circular halftone pattern.
   *   - Dot Screen: Creates a dot pattern halftone effect.
   *   - CMYK Halftone: Creates a halftone effect using CYMK colors (looks like an old comic book).
   *   - Hatched Screen: Creates a halftone effect using both horizontal and vertical lines.
   *   - Line Screen: Creates a halftone effect using vertical lines.
   *   - Bump: Creates a bump at the center of the image.
   *   - Circle Splash: Stretches pixels away from the edges of a circle in the center of the image.
   *   - Circular Wrap: Wraps the image around a circle.
   *   - Droste: Creates a recursive effect, where the image appears to repeat within itself.
   *   - Glass Lozenge: Adds a lozenge-shaped lens distortion over the center of the image.
   *   - Hole: Creates a hole in the center of the image.
   *   - Light Tunnel: Creates a tunnel-like effect with light rays emanating from the center.
   *   - Linear Bump: Creates a bump along a line running through the center of the image.
   *   - Pinch: Pinches pixels inward toward the center of the image.
   *   - Torus Lens: Adds a toroidal lens distortion in the center of the image.
   *   - Twirl: Creates a twirl effect by rotating pixels around the center of the image.
   *   - Vortex: Creates a vortex-like effect with light rays emanating from the center.
   *
   * - Sharpening Filters:
   *   - Sharpen Luminance: Increases detail by sharpening. Operates on luminance only, not chrominance.
   *   - Unsharp Mask: Increases contrast of edges between pixels of different colors.
   *
   * - Style Filters:
   *   - Bloom: Softens edges, add a slight glow effect.
   *   - Comic: Simulate a comic book drawing by outlining edges and applying a color halftone effort.
   *   - Crystallize: Creates polygon-shaped areas of color by aggregating pixel color values.
   *   - Depth of Field: Simulates the miniaturization effect of a tilt shift lens.
   *   - Edges: Isolates edges and displays them in color over a black background.
   *   - Edge Work: Isolates edges and displays them in a stylized black and white style over a transparent background, similar to a woodblock cutout.
   *   - Gabor Gradients: Isolates edges using a 5x5 Gabor gradient; maximizes horizontal red and vertical green gradients.
   *   - Gloom: Dulls highlights.
   *   - Height Field From Mask: Creates a smooth 3D height field from a grayscale mask, white for inside and black for outside.
   *   - Hexagonal Pixellate: Creates a hexagonal pattern by averaging pixel color values.
   *   - Line Overlay: Isolates edges and displays them in black over a transparent background.
   *   - Pixellate: Makes images blocky.
   *   - Pointillize: Renders images in a pointillistic style.
   *   - Spotlight: Applies a directional spotlight effect at the center of the image.
   *
   * - Tiling Filters:
   *   - n-fold Reflected Tile: Creates tiled images by applying n-way reflection.
   *   - n-fold Rotated Tile: Creates a tiled image by rotating the original at increments of 90 degrees.
   *   - n-fold Translated Tile: Creates tiled images by applying 4 translation operations.
   *   - Glide Reflected Tile: Creates a tiled image by translating and smearing the original.
   *   - Kaleidoscope: Creates a kaleidoscopic image by applying 12-way symmetry.
   *   - Op Tile: Segments and re-assembles images to give create op art effect.
   *   - Parallelogram Tile: Reflects an image in a parallelogram, then tiles the result.
   *   - Perspective Tile: Applies perspective transform to an image, then tiles the result.
   *   - Triangle Kaleidoscope: Creates a kaleidoscopic image using a triangular portion of an image.
   *   - Triangle Tile: Tiles a triangular portion of an image.
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
