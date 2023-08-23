import { List, ActionPanel, Action, Icon } from "@raycast/api";

export default function ResultSection({
  output,
  isShowingDetail,
  setIsShowingDetail,
}: {
  output: string;
  isShowingDetail: boolean;
  setIsShowingDetail: (value: boolean) => void;
}) {
  return (
    <List.Section title="Result">
      {output ? (
        <List.Item
          title={output}
          detail={<List.Item.Detail markdown={output} />}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={output} />
              <Action title="Toggle Full Text" icon={Icon.Text} onAction={() => setIsShowingDetail(!isShowingDetail)} />
            </ActionPanel>
          }
        />
      ) : null}
    </List.Section>
  );
}
