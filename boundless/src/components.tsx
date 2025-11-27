import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { WordInfo, translateWordInfo } from "./backend";

export function QueryWordListItem({
  item,
  definition,
}: {
  item: WordInfo;
  definition: WordInfo["definitions"][number];
}) {
  const markdown = `
# ${item.word} 
### ${definition.pos} ${item.decomp && item.decomp !== item.word ? `(${item.decomp})` : ""} ${item.pronunciation} ${definition.cn_mean}
*${definition.example ? `${definition.example}` : ""}*
  `;

  return (
    <List.Item
      title={item.word}
      subtitle={definition.cn_mean}
      detail={
        <List.Item.Detail
          markdown={markdown}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="词性" text={`${definition.pos}`} icon={Icon.Box} />
              <List.Item.Detail.Metadata.Label title="发音" text={`${item.pronunciation}`} icon={Icon.Microphone} />
              {item.decomp && <List.Item.Detail.Metadata.Label title="分解" text={item.decomp} icon={Icon.Layers} />}
              <List.Item.Detail.Metadata.Separator />
              {definition.var_form?.verb_form?.passive && (
                <List.Item.Detail.Metadata.Label title="被动形式" text={`${definition.var_form.verb_form.passive}`} />
              )}
              {definition.var_form?.verb_form?.participles && (
                <List.Item.Detail.Metadata.Label title="分词形式" text={definition.var_form.verb_form.participles} />
              )}
              {definition.var_form?.adj_form?.cmp && (
                <List.Item.Detail.Metadata.Label title="形容词" text={definition.var_form.adj_form.cmp} />
              )}
              {definition.var_form?.noun_form?.plural && (
                <List.Item.Detail.Metadata.Label title="复数形式" text={definition.var_form.noun_form.plural} />
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Word"
            content={item.word}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Meaning"
            content={definition.cn_mean}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

export function TranslateListItem({ item }: { item: translateWordInfo }) {
  const markdown = `
# ${item.candidate}
---
*${item.example || "No example provided"}*
  `;

  return (
    <List.Item
      title={item.candidate}
      subtitle={item.usage}
      detail={
        <List.Item.Detail
          markdown={markdown}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="用法/释义" text={item.usage} icon={Icon.Info} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Word"
            content={item.candidate}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
