import { Action, ActionPanel, Icon, Keyboard, LaunchProps, List } from "@raycast/api";
import { useState } from "react";
import { Conversion, convert } from "./permissions";

const EXAMPLES = ["755", "rwxrwx---", "4755", "drwxr-xr-x", "lrwxrwxrwx", "120777", "6", "rw-"];

export default function Command(props: LaunchProps<{ arguments: { input?: string } }>) {
  const [searchText, setSearchText] = useState((props.arguments?.input ?? props.fallbackText ?? "").trim());
  const conversion = convert(searchText);

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="770, rwxrwx---, drwxr-xr-x, 6, rw- …"
      filtering={false}
      isShowingDetail={searchText.trim() !== ""}
    >
      {conversion ? (
        <ResultItem conversion={conversion} />
      ) : searchText.trim() ? (
        <InvalidItem input={searchText.trim()} />
      ) : (
        <List.Section title="Examples">
          {EXAMPLES.map((example) => {
            const preview = convert(example);
            return (
              <List.Item
                key={example}
                icon={Icon.Key}
                title={example}
                subtitle={preview ? `→ ${preview.to}` : undefined}
                actions={
                  <ActionPanel>
                    <Action title="Use Example" icon={Icon.Pencil} onAction={() => setSearchText(example)} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}

function ResultItem({ conversion: c }: { conversion: Conversion }) {
  const markdown = [
    `# ${c.from}  →  ${c.to}`,
    c.partial ? "\n*Partial mode — not a complete permission set*" : "",
  ].join("\n");
  const hasSpecial = c.setuid || c.setgid || c.sticky;

  return (
    <List.Section title="Conversion">
      <List.Item
        icon={Icon.Key}
        title={`${c.from} → ${c.to}`}
        detail={
          <List.Item.Detail
            markdown={markdown}
            metadata={
              <List.Item.Detail.Metadata>
                {c.fileType && (
                  <List.Item.Detail.Metadata.Label
                    title="File Type"
                    text={c.fileType.name}
                    icon={fileTypeIcon(c.fileType.char)}
                  />
                )}
                {c.triads.map((t) => (
                  <List.Item.Detail.Metadata.Label key={t.label} title={t.label} text={`${t.symbolic}  (${t.digit})`} />
                ))}
                {hasSpecial && <List.Item.Detail.Metadata.Separator />}
                {c.setuid && <List.Item.Detail.Metadata.Label title="Setuid" text="Yes (4000)" />}
                {c.setgid && <List.Item.Detail.Metadata.Label title="Setgid" text="Yes (2000)" />}
                {c.sticky && <List.Item.Detail.Metadata.Label title="Sticky Bit" text="Yes (1000)" />}
                <List.Item.Detail.Metadata.Separator />
                {c.fullOctal && <List.Item.Detail.Metadata.Label title="Full Octal Mode" text={c.fullOctal} />}
                {c.chmodCommand && <List.Item.Detail.Metadata.Label title="Command" text={c.chmodCommand} />}
              </List.Item.Detail.Metadata>
            }
          />
        }
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title={`Copy "${c.to}"`} content={c.to} shortcut={Keyboard.Shortcut.Common.Copy} />
            {c.to !== c.numeric && <Action.CopyToClipboard title="Copy Numeric" content={c.numeric} />}
            {c.to !== c.symbolic && <Action.CopyToClipboard title="Copy Symbolic" content={c.symbolic} />}
            {c.chmodCommand && <Action.CopyToClipboard title="Copy Chmod Command" content={c.chmodCommand} />}
            {c.fullOctal && <Action.CopyToClipboard title="Copy Full Octal Mode" content={c.fullOctal} />}
          </ActionPanel>
        }
      />
    </List.Section>
  );
}

function InvalidItem({ input }: { input: string }) {
  const markdown = [
    "# Not a valid mode",
    "",
    `\`${input}\` is not a valid permission mode.`,
    "",
    "Try `770`, `rwxrwx---`, `4755`, `drwxr-xr-x`, `120777`, `6` or `rw-`.",
  ].join("\n");

  return (
    <List.Section title="Conversion">
      <List.Item
        icon={Icon.Warning}
        title={input}
        subtitle="Not a valid mode"
        detail={<List.Item.Detail markdown={markdown} />}
      />
    </List.Section>
  );
}

function fileTypeIcon(char: string): Icon {
  switch (char) {
    case "d":
      return Icon.Folder;
    case "l":
      return Icon.Link;
    default:
      return Icon.Document;
  }
}
