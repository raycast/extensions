import { FooterActions } from "./components/Footer";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { ToolForm } from "./components/ToolForm";
import { ToolResult } from "./components/ToolResult";
import { eyebrow, table } from "./lib/theme";
import { GROUP_LABEL, Group, TOOLS } from "./lib/tools";

const ORDER: Group[] = ["open", "pro", "account_read", "account_write"];

export default function Command() {
  return (
    <List searchBarPlaceholder={`Run any of ${TOOLS.length} FirmLedger tools…`} isShowingDetail>
      {ORDER.map((g) => (
        <List.Section key={g} title={GROUP_LABEL[g]} subtitle={String(TOOLS.filter((t) => t.group === g).length)}>
          {TOOLS.filter((t) => t.group === g).map((t) => (
            <List.Item
              key={t.name}
              title={t.title}
              subtitle={t.name}
              keywords={[t.name, t.desc, ...t.args.map((a) => a.name)]}
              icon={g === "account_write" ? Icon.Pencil : g === "open" ? Icon.Globe : Icon.Lock}
              detail={
                <List.Item.Detail
                  markdown={`${eyebrow(GROUP_LABEL[g])}\n\n# ${t.title}\n\n${t.desc}\n\n\`${t.name}\`\n\n${
                    t.args.length
                      ? table(
                          ["Argument", "Type", "Required", "Description"],
                          t.args.map((a) => [a.name, a.type, a.req ? "Yes" : "No", a.desc ?? "—"]),
                        )
                      : "This tool takes no arguments."
                  }${g === "account_write" ? "\n\nEvery change shows a confirmation dialog with the exact action before anything happens." : ""}`}
                />
              }
              actions={
                <ActionPanel>
                  <Action.Push
                    title={t.args.length ? "Open Form" : "Run"}
                    icon={Icon.Play}
                    target={t.args.length ? <ToolForm toolName={t.name} /> : <ToolResult toolName={t.name} />}
                  />
                  <Action.CopyToClipboard title="Copy Tool Name" content={t.name} />
                  <FooterActions />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
