import { ActionPanel, List, Action } from "@raycast/api";
import { groupBy } from "lodash"; // It will be ironic if I didn't use Lodash here
import lodash from "./lodash.json";

export default function Command() {
  const groups = groupBy(lodash, "category");
  return (
    <List isShowingDetail searchBarPlaceholder="Search functions...">
      {Object.entries(groups).map(([category, items]) => (
        <List.Section key={category} title={category}>
          {items.map((item) => (
            <List.Item
              key={item.name}
              title={item.name}
              detail={
                <List.Item.Detail
                  markdown={`# ${item.name}\n\n${item.description}\n\n### Arguments\n\n${item.params
                    .map((param) => `- **${param.name} *(${param.type})***: ${param.description}`)
                    .join("\n")}\n\n${
                    item.returns ? `### Returns\n\n- ***(${item.returns.type})***: ${item.returns.description}\n\n` : ""
                  }### Example\n\n\`\`\`js\n${item.examples.join("\n\n")}\n\`\`\``}
                />
              }
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={`https://lodash.com/docs/#${item.name}`} />
                  <ActionPanel.Section>
                    <Action.CopyToClipboard title="Copy Name" content={item.name} />
                    <Action.CopyToClipboard title="Copy URL" content={`https://lodash.com/docs/#${item.name}`} />
                    <Action.CopyToClipboard title="Copy Import" content={`import { ${item.name} } from "lodash"`} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
