import { LaunchProps, showHUD } from "@raycast/api";
import { createObject, MyMindApiError } from "./api";

interface Arguments {
  url: string;
  title?: string;
  tags?: string;
}

function parseTags(raw: string | undefined): string[] | undefined {
  if (!raw) return undefined;
  const tags = raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  return tags.length ? tags : undefined;
}

export default async function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const { url, title, tags } = props.arguments;

  if (!url || !/^https?:\/\/\S+$/i.test(url.trim())) {
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
