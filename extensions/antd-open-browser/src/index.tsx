import { List, ActionPanel, Action, getPreferenceValues, environment } from "@raycast/api";
import dataEnUs from "./data.en-US.json";
import dataZhCn from "./data.zh-CN.json";

type DataItem = {
  title: string;
  items: {
    title: string;
    subtitle?: string;
    description: string;
    cover: string;
    coverDark?: string;
    documentation: string;
  }[];
};

export default Command;
function Command() {
  const { language } = getPreferenceValues<{
    language?: "en-US" | "zh-CN";
  }>();

  console.log({ language });

  const list: DataItem[] = language === "en-US" ? dataEnUs : dataZhCn;

  return (
    <List isShowingDetail>
      {list.map(({ title: groupTitle, items }) => (
        <List.Section key={groupTitle} title={groupTitle}>
          {items.map(({ title, cover, coverDark, subtitle, description, documentation }) => (
            <List.Item
              title={title}
              key={title}
              subtitle={subtitle}
              detail={
                cover && (
                  <List.Item.Detail
                    markdown={`![Illustration](${
                      environment.appearance === "dark" ? coverDark : cover
                    })\n\n${description}`}
                  />
                )
              }
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={documentation} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
