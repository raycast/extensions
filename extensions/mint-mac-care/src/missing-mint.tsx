import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { MintCLIResolution, MINIMUM_SCHEMA_VERSION } from "./mint-cli";

export function MissingMint({ resolution, onRetry }: { resolution: MintCLIResolution; onRetry: () => void }) {
  const message =
    resolution.status === "untrusted"
      ? {
          title: "Mint CLI signature could not be verified",
          description:
            "A mint-cli binary was found, but it was not signed by DZG Studio LLC. The extension refused to run it.",
        }
      : resolution.status === "incompatible"
        ? {
            title: "Update Mint to continue",
            description: `The installed Mint CLI does not provide schema ${MINIMUM_SCHEMA_VERSION} with the required read-only capabilities.`,
          }
        : {
            title: "Mint CLI not found",
            description: "Install the latest direct edition of Mint and launch it once from Finder.",
          };

  return (
    <Detail
      markdown={`# ${message.title}

${message.description}

Mint links its bundled CLI into \`/opt/homebrew/bin\` or \`/usr/local/bin\` without overwriting files it did not create. This extension verifies Mint's Developer ID signature and compatibility contract before running read-only status, scan, or explanation commands. File cleanup remains inside Mint's review and journal workflow.`}
      actions={
        <ActionPanel>
          <Action title="Check Again" icon={Icon.ArrowClockwise} onAction={onRetry} />
          <Action.OpenInBrowser title="Download Mint" icon={Icon.Download} url="https://mint.dzgapp.com" />
          <Action.OpenInBrowser title="Read CLI Documentation" url="https://mint.dzgapp.com/docs#cli-overview" />
        </ActionPanel>
      }
    />
  );
}
