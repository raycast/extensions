import { Action, ActionPanel, Image, List } from "@raycast/api";

interface tsItemProps {
  title: string;
  subtitle: string;
  icon: Image.ImageLike;
}

export default function TsListItem(props: tsItemProps) {
  const { title, subtitle, icon } = props;
  return (
    <List.Item
      title={title}
      subtitle={subtitle}
      icon={icon}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={title}></Action.CopyToClipboard>
        </ActionPanel>
      }
    ></List.Item>
  );
}
