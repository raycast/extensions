import { Action, ActionPanel, Detail } from "@raycast/api";
import { INSTALL_COMMAND, type ToolId } from "./io/tools";

const REASON: Record<ToolId, string> = {
  ffmpeg:
    "resizing emotes to the exact emoji (32px) and sticker (128px) heights",
  magick: "decoding animated WebP emotes, which most ffmpeg builds cannot read",
};

export function ToolMissing({ tool }: { tool: ToolId }) {
  const command = INSTALL_COMMAND[tool];
  const markdown = `# ${tool} is required

This emote needs \`${tool}\` for ${REASON[tool]}.

Install it with:

\`\`\`sh
${command}
\`\`\`

If it is already installed somewhere unusual, set its full path in the extension
preferences — Raycast does not inherit your shell \`PATH\`.

7TV emotes are served at the exact heights and never need any external tool.`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Install Command"
            content={command}
          />
          <Action.OpenInBrowser title="Open Homebrew" url="https://brew.sh" />
        </ActionPanel>
      }
    />
  );
}
