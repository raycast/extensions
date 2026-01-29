import {
  Clipboard,
  showHUD,
  showToast,
  Toast,
  LaunchProps,
} from "@raycast/api";
import { parseGraphiteUrl, toGitHubUrl, isAllowed } from "./utils/url-parser";
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
        message: "Please copy a Graphite PR URL or select it",
      });
      return;
    }

    // Parse Graphite URL
    const prInfo = parseGraphiteUrl(inputUrl);

    if (!prInfo) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Graphite URL",
        message: "Could not parse as a Graphite PR URL",
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

    // Convert and copy
    const githubUrl = toGitHubUrl(prInfo);
    await Clipboard.copy(githubUrl);

    await showHUD("Copied GitHub PR URL");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    });
  }
}
