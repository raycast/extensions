import { PopiconVariant } from "../enums/popicon-variant";
import { Popicon } from "../schemas/popicon";
import { exhaustive } from "../utilities/exhaustive";

function getSvg(icon: Popicon, variant: PopiconVariant): string {
  switch (variant) {
    case PopiconVariant.Line:
      return icon.variantLineSVG;
    case PopiconVariant.Solid:
      return icon.variantSolidSVG;
    case PopiconVariant.Duotone:
      return icon.variantDuotoneSVG;
    default:
      return exhaustive(variant, `Unknown variant: ${variant}`);
  }
}

export { getSvg };
