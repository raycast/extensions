import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { loadBindings } from "./lib/config";

export default function Command() {
  const { data, isLoading, error } = useCachedPromise(async () => {
    const { raw, configPath, bindings } = await loadBindings();
    return { raw, configPath, count: bindings.length };
  }, []);

  const markdown = error
    ? `# Couldn't read your config\n\n${error.message}`
    : data
      ? "```toml\n" + data.raw + "\n```"
      : "";

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="AeroSpace Config"
      markdown={markdown}
      metadata={
        data ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Path" text={data.configPath} />
            <Detail.Metadata.Label title="Bindings" text={String(data.count)} />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        data ? (
          <ActionPanel>
            <Action.Open title="Open in Editor" target={data.configPath} icon={Icon.Pencil} />
            <Action.CopyToClipboard title="Copy Path" content={data.configPath} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
