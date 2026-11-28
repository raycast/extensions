import { getPreferenceValues, type Tool } from "@raycast/api";
import { downloadFont, getDownloadFolder } from "../utils/downloader";
import { getFaceLabel, filterFontsByPreferences } from "../utils/fontActions";
import { extractFonts } from "../utils/fontExtractor";

type Input = {
  /** The same page URL used with identify-website-fonts. */
  pageUrl: string;
  /** Exact face label returned by identify-website-fonts. */
  face: string;
};

export const confirmation: Tool.Confirmation<Input> = async ({
  face,
  pageUrl,
}) => ({
  message: "Save this font to Downloads?",
  info: [
    { name: "Font", value: face },
    { name: "Website", value: pageUrl },
    { name: "Folder", value: getDownloadFolder() },
  ],
});

/** Download one discovered font to the Downloads folder using the user's web-font conversion preference. */
export default async function downloadWebsiteFont({ pageUrl, face }: Input) {
  const prefs = getPreferenceValues<Preferences>();
  const fonts = filterFontsByPreferences(await extractFonts(pageUrl), prefs);
  const matches = fonts.filter((font) => getFaceLabel(font) === face);
  if (matches.length !== 1)
    throw new Error(
      "The requested font could not be uniquely identified. Identify the page's fonts again.",
    );
  const result = await downloadFont(matches[0], getDownloadFolder(), {
    pageUrl,
    convertWoff2ToTtf: prefs.convertWoff2ToTtf,
  });
  if (!result.success) throw new Error(result.error);
  return { face, filePath: result.filePath };
}
