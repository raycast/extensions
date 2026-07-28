import { Action, ActionPanel, Detail } from "@raycast/api";
import { RpassError } from "../../rpass/application/rpass-client";

export const GPG_TIMEOUT_MESSAGE =
  "GPG unlock timed out. Make sure the passphrase is correct and loopback pinentry is enabled.";

export const GPG_TIMEOUT_HELP = `# Avoiding GPG Timeouts

If decrypting entries times out, GPG may be waiting for pinentry.

For non-interactive unlocks, enable loopback pinentry.

## macOS / Linux

Edit \`~/.gnupg/gpg-agent.conf\` and add:

\`\`\`text
allow-loopback-pinentry
\`\`\`

Restart gpg-agent:

\`\`\`bash
gpgconf --kill gpg-agent
\`\`\`

## Windows

Edit \`%APPDATA%\\gnupg\\gpg-agent.conf\` and add:

\`\`\`text
allow-loopback-pinentry
\`\`\`

Restart gpg-agent:

\`\`\`bash
gpgconf --kill gpg-agent
\`\`\`

This does not change GPG cache durations. It only allows \`rpass --passphrase-stdin\` to pass the passphrase directly to GPG instead of opening a pinentry UI.`;

export function isGpgTimeoutOrPinentryError(error: unknown): boolean {
  if (!(error instanceof RpassError)) return false;

  const text = [error.message, error.details]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
  return (
    error.code === "rpass_timeout" ||
    error.code === "gpg_decrypt_failed" ||
    text.includes("pinentry") ||
    text.includes("no pinentry") ||
    text.includes("inappropriate ioctl")
  );
}

export function formatGpgAwareError(message: string, error: unknown): string {
  return isGpgTimeoutOrPinentryError(error) ? GPG_TIMEOUT_MESSAGE : message;
}

export function GpgTimeoutHelp() {
  return (
    <Detail
      markdown={GPG_TIMEOUT_HELP}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Setup Instructions"
            content={GPG_TIMEOUT_HELP}
          />
        </ActionPanel>
      }
    />
  );
}
