import type { LaunchProps } from "@raycast/api";
import { findUrl, saveWithToast } from "./lib/capture";
import { parseTags, parseWebUrl } from "./lib/urls";

interface QuickSaveArguments {
  url?: string;
  tags?: string;
}

interface QuickSaveContext {
  folderId?: string;
}

export default async function Command(
  props: LaunchProps<{ arguments: QuickSaveArguments; launchContext: QuickSaveContext }>,
) {
  const typed = props.arguments.url?.trim();
  await saveWithToast(
    async () => {
      if (typed) return parseWebUrl(typed) ?? typed;
      return (await findUrl())?.url ?? null;
    },
    { tags: parseTags(props.arguments.tags), folderId: props.launchContext?.folderId },
  );
}
