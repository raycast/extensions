import { PopiconVariant } from "../enums/popicon-variant";
import { exhaustive } from "./exhaustive";

function getVariantName(variant: PopiconVariant): string {
  switch (variant) {
    case PopiconVariant.Line:
      return "Line";
    case PopiconVariant.Solid:
      return "Solid";
    case PopiconVariant.Duotone:
      return "Duotone";
    default:
      return exhaustive(variant, `Unknown variant: ${variant}`);
  }
}

export { getVariantName };
