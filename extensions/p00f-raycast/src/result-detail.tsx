import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Toast,
  open,
  showToast,
} from "@raycast/api";
import type { CreatedClip } from "@p00f/core";
import {
  burnCreatedPoof,
  copyCreatedLink,
  copyOwnerToken,
  pasteCreatedLink,
} from "./lib/result-actions";

interface ResultDetailProps {
  created: CreatedClip;
}

const http = (input: string, init?: RequestInit) => fetch(input, init);

export function ResultDetail({ created }: ResultDetailProps) {
  const markdown = [
    `# Poof created`,
    ``,
    `Link copied to clipboard.`,
    ``,
    `\`${created.link}\``,
  ].join("\n");

  async function burnNow() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Burning Poof",
    });
    try {
      const ok = await burnCreatedPoof(http, created);
      toast.style = ok ? Toast.Style.Success : Toast.Style.Failure;
      toast.title = ok ? "Poof burned" : "Could not burn Poof";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not burn Poof";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Copy Link"
            onAction={() => copyCreatedLink(Clipboard, created.link)}
          />
          <Action
            title="Paste Link in Frontmost App"
            onAction={() => pasteCreatedLink(Clipboard, created.link)}
          />
          <Action
            title="Copy Owner Token"
            onAction={() => copyOwnerToken(Clipboard, created.ownerToken)}
          />
          <Action
            title="Burn Now"
            style={Action.Style.Destructive}
            onAction={burnNow}
          />
          <Action title="Open in Browser" onAction={() => open(created.link)} />
        </ActionPanel>
      }
    />
  );
}
