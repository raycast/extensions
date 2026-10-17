import { Action, ActionPanel, Detail, Icon, useNavigation } from "@raycast/api";

type Props = { markdown: string };

export const MemoPreview = ({ markdown }: Props) => {
  const { pop } = useNavigation();
  return (
    <Detail
      navigationTitle="Preview"
      markdown={markdown.trim() === "" ? "*Nothing to preview yet.*" : markdown}
      actions={
        <ActionPanel>
          <Action title="Back to Editor" icon={Icon.ArrowLeft} onAction={pop} />
        </ActionPanel>
      }
    />
  );
};
