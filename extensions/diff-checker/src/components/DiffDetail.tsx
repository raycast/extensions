import { Action, ActionPanel, Color, Detail, Icon, useNavigation } from "@raycast/api";
import { DiffResult } from "../types";

export const DiffDetail = ({ result }: { result: DiffResult }) => {
  const { pop } = useNavigation();

  return (
    <Detail
      markdown={result.markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Added Lines">
            <Detail.Metadata.TagList.Item text={`+${result.additions}`} color={Color.Green} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Removed Lines">
            <Detail.Metadata.TagList.Item text={`-${result.removals}`} color={Color.Red} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Total Changed">
            <Detail.Metadata.TagList.Item
              text={`${result.additions + result.removals} lines`}
              color={result.additions + result.removals === 0 ? Color.Green : Color.Orange}
            />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Full Diff" content={result.fullDiff} />
          <Action.CopyToClipboard
            title="Copy Compact Diff"
            content={result.markdown}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Formatted Original"
            content={result.originalFormatted}
            shortcut={{ modifiers: ["cmd"], key: "1" }}
          />
          <Action.CopyToClipboard
            title="Copy Formatted Modified"
            content={result.modifiedFormatted}
            shortcut={{ modifiers: ["cmd"], key: "2" }}
          />
          <Action
            title="Compare Again"
            icon={Icon.ArrowLeftCircle}
            onAction={pop}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    />
  );
};
