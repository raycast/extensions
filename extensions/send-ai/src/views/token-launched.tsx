import { ActionPanel, Action, Detail } from "@raycast/api";
import { LaunchTokenFormValues } from "../launch-token";

const getMarkdown = (launchData: LaunchTokenFormValues, mintAddress: string) => {
  return `
## Token Successfully Launched!

Your token has been successfully launched on SendShot! 🎉

\`\`\`
${mintAddress}
\`\`\`


## Token Details
- **Name:** ${launchData.name}
- **Symbol:** ${launchData.ticker}
- **Mint Address:** ${mintAddress}
- **Description:** ${launchData.description}

${launchData.twitter ? `- **Twitter:** ${launchData.twitter}` : ""}
${launchData.telegram ? `- **Telegram:** ${launchData.telegram}` : ""}
${launchData.website ? `- **Website:** ${launchData.website}` : ""}

---

View on Jup: https://jup.ag/tokens/${mintAddress}

You can claim your creator fee on SendShot: https://sendshot.fun
`;
};

function TokenLaunched({ launchData, mintAddress }: { launchData: LaunchTokenFormValues; mintAddress: string }) {
  return (
    <Detail
      markdown={getMarkdown(launchData, mintAddress)}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy CA" content={mintAddress} />
        </ActionPanel>
      }
    />
  );
}

export default TokenLaunched;
