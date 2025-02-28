import { type LaunchProps, getPreferenceValues, showToast, Toast, open } from "@raycast/api";
import { bangs, type Bang } from "./bang";

interface Preferences {
  defaultBang?: string;
}

export default async function main(props: LaunchProps<{ arguments: Arguments.Search }>) {
  const { query } = props.arguments;
  const q = query ?? props.fallbackText;

  const preferences = getPreferenceValues<Preferences>();

  const LS_DEFAULT_BANG = preferences.defaultBang ?? "g";
  const defaultBang = bangs.find((b) => b.t === LS_DEFAULT_BANG);

  const searchUrl = getBangredirectUrl(q, defaultBang);
  if (!searchUrl) {
    showToast({ title: "No search query found.", style: Toast.Style.Failure });
    return;
  }

  await open(searchUrl);
}

function getBangredirectUrl(query: string, defaultBang?: Bang) {
  const match = query.match(/!(\S+)/i);

  const bangCandidate = match?.[1]?.toLowerCase();
  const selectedBang = bangs.find((b) => b.t === bangCandidate) ?? defaultBang;

  // Remove the first bang from the query
  const cleanQuery = query.replace(/!\S+\s*/i, "").trim();

  // Format of the url is:
  // https://www.google.com/search?q={{{s}}}
  const searchUrl = selectedBang?.u.replace(
    "{{{s}}}",
    // Replace %2F with / to fix formats like "!ghr+t3dotgg/unduck"
    encodeURIComponent(cleanQuery).replace(/%2F/g, "/"),
  );
  if (!searchUrl) return null;

  return searchUrl;
}
