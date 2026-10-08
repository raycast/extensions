import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Toast,
  open,
  showToast,
} from "@raycast/api";
import { useState } from "react";
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

const liveMarkdown = (link: string) =>
  [`# Poof created`, ``, `Link copied to clipboard.`, ``, `\`${link}\``].join(
    "\n",
  );

const burnedMarkdown = [
  `# Poof burned`,
  ``,
  `This Poof is gone. The link no longer resolves and the ciphertext has been deleted from the server.`,
].join("\n");

// Raycast Action.onAction is fire-and-forget: a rejected promise from an async
// handler would surface as an unhandled rejection with no user feedback. Every
// handler below is wrapped so failures become a Failure toast instead.
async function runAction(failureTitle: string, action: () => Promise<void>) {
  try {
    await action();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: failureTitle,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export function ResultDetail({ created }: ResultDetailProps) {
  const [burned, setBurned] = useState(false);

  async function burnNow() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Burning Poof",
    });
    try {
      const ok = await burnCreatedPoof(http, created);
      toast.style = ok ? Toast.Style.Success : Toast.Style.Failure;
      toast.title = ok ? "Poof burned" : "Could not burn Poof";
      if (ok) setBurned(true);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not burn Poof";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <Detail
      markdown={burned ? burnedMarkdown : liveMarkdown(created.link)}
      actions={
        burned ? undefined : (
          <ActionPanel>
            <Action
              title="Copy Link"
              onAction={() =>
                runAction("Could not copy Link", () =>
                  copyCreatedLink(Clipboard, created.link),
                )
              }
            />
            <Action
              title="Paste Link in Frontmost App"
              onAction={() =>
                runAction("Could not paste Link", () =>
                  pasteCreatedLink(Clipboard, created.link),
                )
              }
            />
            <Action
              title="Copy Owner Token"
              onAction={() =>
                runAction("Could not copy owner token", () =>
                  copyOwnerToken(Clipboard, created.ownerToken),
                )
              }
            />
            <Action
              title="Burn Now"
              style={Action.Style.Destructive}
              onAction={burnNow}
            />
            <Action
              title="Open in Browser"
              onAction={() =>
                runAction("Could not open Link", async () => {
                  await open(created.link);
                })
              }
            />
          </ActionPanel>
        )
      }
    />
  );
}
