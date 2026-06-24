import { LaunchProps, showHUD } from "@raycast/api";
import { createObject, MyMindApiError } from "./api";
import { looksLikeUrl, parseTags } from "./utils";

export default async function Command(props: LaunchProps<{ arguments: Arguments.SaveUrlToMymind }>) {
  const { url, title, tags } = props.arguments;

  if (!url || !looksLikeUrl(url)) {
    await showHUD("✗ mymind — invalid URL");
    return;
  }

  try {
    await createObject({
      kind: "url",
      url: url.trim(),
      title: title?.trim() || undefined,
      tags: parseTags(tags),
    });
    await showHUD("✓ Saved to mymind");
  } catch (error) {
    if (error instanceof MyMindApiError && error.isUnauthorized) {
      await showHUD("✗ mymind — auth error, check preferences");
      return;
    }
    const message = error instanceof Error ? error.message : String(error);
    await showHUD(`✗ mymind — ${message}`);
  }
}
