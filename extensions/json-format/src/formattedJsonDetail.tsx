import { ActionPanel, Action, Detail, getPreferenceValues } from "@raycast/api";

export const FormattedJsonDetail = ({ json }: { json: string | string[] }) => {
  const { autopaste } = getPreferenceValues<Preferences>();

  return (
    <Detail
      markdown={
        typeof json === "string"
          ? `\`\`\`json\n${json}\n\`\`\``
          : json.map((j) => `\`\`\`json\n${j}\n\`\`\``).join("\n\n")
      }
      navigationTitle={typeof json === "string" ? "Formatted JSON" : "Formatted JSON Lines"}
      actions={
        <ActionPanel>
          {autopaste && <Action.Paste title="Paste" content={typeof json === "string" ? json : json.join("\n")} />}
          {!autopaste && (
            <Action.CopyToClipboard
              title="Copy to Clipboard"
              content={typeof json === "string" ? json : json.join("\n")}
            />
          )}
        </ActionPanel>
      }
    />
  );
};
