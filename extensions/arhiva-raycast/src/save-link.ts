import { launchCommand, LaunchType, showHUD } from "@raycast/api";
import type { LaunchProps } from "@raycast/api";

import { createBookmark } from "./lib/bookmarks";
import { getCurrentBrowserTab } from "./lib/browser-tab";
import { getErrorMessage, isAuthRequiredError } from "./lib/errors";
import { parseTags } from "./lib/tags";
import { isHttpUrlString } from "./lib/utils";

type SaveLinkArguments = Readonly<{
  url?: string;
  tags?: string;
}>;

type SaveTarget = Readonly<{
  url: string;
  title?: string;
}>;

async function getSaveTarget(argumentUrl: string | undefined): Promise<SaveTarget> {
  const trimmed = argumentUrl?.trim();
  if (trimmed != null && trimmed.length > 0) {
    if (!isHttpUrlString(trimmed)) {
      throw new Error("Enter a valid http(s) URL.");
    }
    return { url: trimmed };
  }

  return await getCurrentBrowserTab();
}

export default async function Command(props: LaunchProps<{ arguments: SaveLinkArguments }>) {
  try {
    const target = await getSaveTarget(props.arguments.url);
    const result = await createBookmark({
      url: target.url,
      title: target.title,
      tags: parseTags(props.arguments.tags),
    });
    await showHUD(result.created ? "Saved to arhiva" : "Updated in arhiva");
  } catch (error) {
    if (isAuthRequiredError(error)) {
      await showHUD("Sign in to save to arhiva");
      await launchCommand({ name: "add-bookmark", type: LaunchType.UserInitiated });
      return;
    }

    await showHUD(getErrorMessage(error, "Save failed"));
  }
}
