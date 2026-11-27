import { imageResult, previewResult, resolveSource, type PostSource, type RenderingOptions } from "../lib/ai";
import { renderContactSheet, renderVariants } from "../lib/renderer";
import { variantOptions, type Dimension } from "../lib/variants";

type Input = {
  source: PostSource;
  /** Compare one dimension, keeping the other options fixed. */
  dimension: Dimension;
  options?: RenderingOptions;
  /** Also generate a six-cell light/dark × 320/390/600 sheet. This sheet always uses collapsed web-timeline. */
  contactSheet?: boolean;
};

/** Compare post themes, four surfaces, widths, resolutions, or collapsed/expanded text as separate PNGs. */
export default async function comparePostLayouts(input: Input) {
  const { post, options, warnings, source } = await resolveSource(input.source, input.options);
  const variants = await renderVariants(post, variantOptions(options, input.dimension));
  return {
    dimension: input.dimension,
    variants: variants.map((preview) =>
      previewResult({ ...preview, source, warnings: [...new Set([...warnings, ...preview.warnings])] }),
    ),
    contactSheet: input.contactSheet
      ? {
          ...imageResult(await renderContactSheet(post, options.dpr)),
          surface: "web-timeline",
          expanded: false,
          widths: [320, 390, 600],
          themes: ["light", "dark"],
          dpr: options.dpr,
        }
      : null,
  };
}
