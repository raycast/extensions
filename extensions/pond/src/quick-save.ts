import type { LaunchProps } from "@raycast/api";
import { toError } from "./api/problems";
import { showFailure } from "./components/problem";
import { findUrl, saveWithToast } from "./lib/capture";
import { parseTags, parseWebUrl } from "./lib/urls";

interface QuickSaveContext {
  folderId?: string;
}

export default async function Command(
  props: LaunchProps<{ arguments: Arguments.QuickSave; launchContext: QuickSaveContext }>,
) {
  try {
    const typed = props.arguments.url?.trim();
    await saveWithToast(
      async () => {
        if (typed) return parseWebUrl(typed) ?? typed;
        return (await findUrl())?.url ?? null;
      },
      { tags: parseTags(props.arguments.tags), folderId: props.launchContext?.folderId },
    );
  } catch (error) {
    await showFailure(toError(error), "Couldn't save the URL");
  }
}
