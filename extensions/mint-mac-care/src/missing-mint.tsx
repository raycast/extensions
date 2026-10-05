import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { MINT_DOWNLOAD_URL, MINT_WEBSITE_URL, MintCLIResolution } from "./mint-cli";

/**
 * The page a Raycast user sees before Mint is installed: for most people who
 * find the extension in the Store, the first thing Mint ever shows them.
 */
export function MissingMint({ resolution, onRetry }: { resolution: MintCLIResolution; onRetry: () => void }) {
  const image = "![Mint sorts what fills your Mac into four groups](mint-map.jpg?raycast-width=600)";

  const body =
    resolution.status === "incompatible"
      ? `## Update Mint to use these commands

This extension needs Mint 1.0.80 or later. Open Mint and choose **Check for Updates**, then come back and press ↵.`
      : resolution.status === "untrusted"
        ? `## This copy of Mint could not be verified

A \`mint-cli\` was found, but it is not signed by DZG Studio, so the extension will not run it. Download Mint again from mintstorage.app.`
        : `## Mint for Raycast works with the Mint app

Mint does the scanning, cleaning and organizing on your Mac. These commands are its shortcuts in Raycast.

1. **Download Mint.** It is free: scanning, organizing and freeing memory stay free, and so does your first 1 GB of cleanup.
2. **Open Mint** from Applications once.
3. **Come back here** and press ↵.

Mint from the Mac App Store or Setapp does not include the command-line tool these commands use.`;

  return (
    <Detail
      navigationTitle="Mint"
      markdown={`${image}\n\n${body}`}
      actions={
        <ActionPanel>
          {resolution.status === "not-found" ? (
            <>
              <Action.OpenInBrowser title="Download Mint" icon={Icon.Download} url={MINT_DOWNLOAD_URL} />
              <Action title="I Installed Mint" icon={Icon.ArrowClockwise} onAction={onRetry} />
            </>
          ) : (
            <>
              <Action title="Check Again" icon={Icon.ArrowClockwise} onAction={onRetry} />
              <Action.OpenInBrowser title="Download Mint" icon={Icon.Download} url={MINT_DOWNLOAD_URL} />
            </>
          )}
          <Action.OpenInBrowser title="See How Mint Works" icon={Icon.Globe} url={MINT_WEBSITE_URL} />
        </ActionPanel>
      }
    />
  );
}
