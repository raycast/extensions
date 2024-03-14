import xml2js from "xml2js";
import { showToast, Toast } from "@raycast/api";


export const parseOpmlToSources =async (opmlData: string) => {
  const parser = new xml2js.Parser();

  try {
    const result = await parser.parseStringPromise(opmlData);
    const outlines = result.opml.body[0].outline;

    const sources = outlines.map((outline: any) => ({
      url: outline['$'].htmlUrl,
      title: outline['$'].title,
      rssLink: outline['$'].xmlUrl,
      schedule: "everyday", // 或 "custom"
      description: outline['$'].text // 或其他适合的字段
    }));

    showToast(Toast.Style.Success, sources)
    return sources;
  } catch (err: any) {
    showToast(Toast.Style.Failure, "Failed to parse opml", err.message)
  }
}
