import { Detail, LaunchProps } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { MintActions } from "./mint-actions";
import { findMintCLI, shortPath } from "./mint-cli";
import { MissingMint } from "./missing-mint";

type Arguments = { path?: string };

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const cli = findMintCLI();
  const path = props.arguments.path?.trim();
  const args = path ? ["why", path, "--json"] : ["why", "--json"];
  const { data, error, isLoading, revalidate } = useExec(cli ?? "/usr/bin/false", args, {
    execute: Boolean(cli),
    timeout: 30_000,
  });

  if (!cli) return <MissingMint />;

  const title = path ? `Why: ${shortPath(path)}` : "Why is reclaimable space changing?";
  const markdown = error
    ? `# Explanation failed\n\n${error.message}`
    : data
      ? `# ${title}\n\n\`\`\`json\n${data}\n\`\`\``
      : `# ${title}\n\nReading Mint's on-device scan history and operation journal…`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle="Mint Why"
      actions={<MintActions output={data} onRefresh={revalidate} />}
    />
  );
}
