import { open, showHUD, showToast, Toast, LaunchProps } from "@raycast/api";
import { parseGitHubUrl, toGraphiteUrl, isAllowed } from "./utils/url-parser";
import { resolveInputUrl } from "./utils/input-resolver";

interface CommandArguments {
  url?: string;
}

export default async function Command(
  props: LaunchProps<{ arguments: CommandArguments }>,
) {
  try {
    // Get URL from arguments, selection, or clipboard
    let inputUrl = props.arguments?.url?.trim();

    if (!inputUrl) {
      inputUrl = (await resolveInputUrl()) ?? undefined;
    }

    if (!inputUrl) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No URL Found",
        message: "Please copy a GitHub PR URL or select it",
      });
      return;
    }

    // Parse GitHub URL
    const prInfo = parseGitHubUrl(inputUrl);

    if (!prInfo) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid GitHub URL",
        message: "Could not parse as a GitHub PR URL",
      });
      return;
    }

    // Check allowlist
    if (!isAllowed(prInfo)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Not Allowed",
        message: `${prInfo.org}/${prInfo.repo} is not in your allowlist`,
      });
      return;
    }

    // Convert and open
    const graphiteUrl = toGraphiteUrl(prInfo);
    await open(graphiteUrl);

    await showHUD("Opening Graphite PR…");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    });
  }
}
