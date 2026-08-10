import { Detail, Icon } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { MintActions } from "./mint-actions";
import { findMintCLI } from "./mint-cli";
import { MissingMint } from "./missing-mint";

export default function Command() {
  const cli = findMintCLI();
  const { data, error, isLoading, revalidate } = useExec(cli ?? "/usr/bin/false", ["scan", "--all", "--json"], {
    execute: Boolean(cli),
    timeout: 120_000,
  });

  if (!cli) return <MissingMint />;

  const markdown = error
    ? `# Scan failed\n\n${error.message}`
    : data
      ? `# Reclaimable-space scan\n\nThis is a read-only scan. Review and cleanup stay inside Mint.\n\n\`\`\`json\n${data}\n\`\`\``
      : `# Scanning your Mac…\n\nMint is checking developer caches, app caches, logs, and junk without changing files.`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle="Mint Scan"
      actions={<MintActions output={data} onRefresh={revalidate} />}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Mode" text="Read-only" icon={Icon.Eye} />
          <Detail.Metadata.Label title="Cleanup" text="Review in Mint" icon={Icon.AppWindow} />
        </Detail.Metadata>
      }
    />
  );
}
