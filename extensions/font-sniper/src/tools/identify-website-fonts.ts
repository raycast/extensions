import { getPreferenceValues } from "@raycast/api";
import { getFaceLabel, filterFontsByPreferences } from "../utils/fontActions";
import { extractFonts } from "../utils/fontExtractor";

type Input = {
  /** HTTP or HTTPS URL of the page to inspect. */
  pageUrl: string;
};

/** Find web fonts referenced by a page and return their CSS family, variants, and source URLs. */
export default async function identifyWebsiteFonts({ pageUrl }: Input) {
  const fonts = filterFontsByPreferences(
    await extractFonts(pageUrl),
    getPreferenceValues<Preferences>(),
  );
  return fonts.map((font) => ({
    face: getFaceLabel(font),
    family: font.family,
    weight: font.weight || "Regular",
    style: font.style || "normal",
    format: font.format,
    source: font.isDataUri ? "embedded" : font.url,
  }));
}
