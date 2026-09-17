import { detectBleed, PT_TO_MM } from "./ai-file";
import { bleedMmToPt } from "./illustrator";

/** Where the bleed for a conversion comes from. */
export type BleedChoice = { mode: "file" } | { mode: "custom"; mm: number } | { mode: "off" };

export type ResolvedBleed = {
  /** Value handed to Illustrator, in points. */
  requestPt: number;
  /** Bleed the exported PDF actually ends up with, in points. */
  actualPt: number;
  /** True when the PDF carries the document's bleed down to the fraction. */
  exact: boolean;
};

/**
 * Turns a choice into the bleed Illustrator is asked for, and the bleed the PDF
 * will really have — which are not always the same number.
 *
 * Illustrator truncates a scripted bleed to whole points, so a document's 3 mm
 * (8.504 pt) would come out as 8 pt / 2.82 mm and fail a printer's 3 mm check.
 * Scripted bleeds therefore round up: the extra fraction of a point sits at the
 * outer bleed edge and is cut away, where a shortfall is not recoverable.
 *
 * The exception is a preset with "Use Document Bleed Settings", which makes
 * Illustrator take the document's own bleed and write it out exactly. That is
 * the only route to a bleed that is not a whole number of points, so in "from
 * the file" mode such a preset is the better one, not a broken one.
 */
export function resolveBleed(input: string, bleed: BleedChoice, presetUsesDocumentBleed: boolean): ResolvedBleed {
  switch (bleed.mode) {
    case "off":
      return { requestPt: 0, actualPt: 0, exact: true };
    case "custom": {
      const pt = bleedMmToPt(bleed.mm);
      return { requestPt: pt, actualPt: pt, exact: pt === bleed.mm / PT_TO_MM };
    }
    case "file": {
      const detected = detectBleed(input);
      if (!detected) {
        throw new Error(
          "Could not read the bleed from this file. It was probably saved without PDF compatibility. Choose Custom or Off instead.",
        );
      }
      const rounded = Math.ceil(detected.maxPt);
      return presetUsesDocumentBleed
        ? { requestPt: rounded, actualPt: detected.maxPt, exact: true }
        : { requestPt: rounded, actualPt: rounded, exact: rounded === detected.maxPt };
    }
  }
}

/** "3 mm bleed" / "no bleed", from the bleed actually applied. */
export function describeBleedPt(bleedPt: number): string {
  return bleedPt === 0 ? "no bleed" : `${formatMm(bleedPt)} bleed`;
}

/** Millimetres with at most one decimal, so 8.504 pt reads as "3 mm". */
export function formatMm(pt: number): string {
  return `${Math.round(pt * PT_TO_MM * 10) / 10} mm`;
}

export function describeChoice(bleed: BleedChoice): string {
  switch (bleed.mode) {
    case "off":
      return "No bleed";
    case "custom":
      return `${bleed.mm} mm bleed`;
    case "file":
      return "Bleed from the file";
  }
}
