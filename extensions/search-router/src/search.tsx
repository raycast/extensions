import { LaunchProps, showToast, Toast } from "@raycast/api";
import { open } from "@raycast/api";
import { findSearchEngine } from "./lib/db";

type Props = LaunchProps<{ arguments: { query: string }; fallbackText?: string }>;

export default async function search(props: Props) {
  try {
    const query = (props.arguments.query ?? props.fallbackText) as string;
    const match = query.trim().match(/!(\S+)/i);
    const searchEngineKey = match?.[1]?.toLowerCase();
    const cleanQuery = query.replace(/!\S+\s*/i, "").trim();

    const searchEngine = await findSearchEngine(searchEngineKey);
    const searchUrl = searchEngine.u.replace("{{{s}}}", encodeURIComponent(cleanQuery).replace(/%2F/g, "/"));
    await open(searchUrl);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Unexpected Error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
