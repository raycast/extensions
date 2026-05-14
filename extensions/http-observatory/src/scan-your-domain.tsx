import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  LaunchProps,
  PopToRootType,
  Toast,
  popToRoot,
  showHUD,
  showToast,
} from "@raycast/api";

import { useData } from "@/hooks/useData";

import { extractDomain, getReportMarkdown } from "@/lib";

const Command = (props: LaunchProps<{ arguments: { url: string } }>) => {
  const domain = extractDomain(props.arguments.url);
  const { data, error, isLoading, revalidate } = useData(domain);

  if (!domain) {
    showHUD("Invalid domain", { popToRootType: PopToRootType.Immediate, clearRootSearch: false });
    return;
  }

  if (!isLoading && error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Something went wrong",
      message: error.message,
    }).then(() => {
      popToRoot({ clearSearchBar: true });
    });
    return;
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={
        isLoading
          ? "Scanning the domain, this may take a while..."
          : !data
            ? "No data"
            : getReportMarkdown(domain, data)
      }
      metadata={
        data ? (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Grade"
              text={{
                value: data.scan.grade,
                color: data.scan.score >= 70 ? Color.Green : data.scan.score <= 30 ? Color.Red : Color.PrimaryText,
              }}
            />
            <Detail.Metadata.Label title="Scan Date" text={data.scan.scanned_at} />
            <Detail.Metadata.Label title="Test Passed" text={`${data.scan.tests_passed}/${data.scan.tests_quantity}`} />
            <Detail.Metadata.Label title="Tests Score" text={data.scan.score.toString()} />
          </Detail.Metadata>
        ) : null
      }
      actions={
        data ? (
          <ActionPanel>
            <ActionPanel.Section title="Result">
              <Action.OpenInBrowser
                title="Open in Browser"
                url={`https://developer.mozilla.org/en-US/observatory/analyze?host=${domain}`}
                icon={Icon.Globe}
              />
              <Action.CopyToClipboard
                title="Copy Result JSON"
                content={JSON.stringify(data, null, 2)}
                icon={Icon.Clipboard}
              />
            </ActionPanel.Section>
            <ActionPanel.Section title="Actions">
              <Action
                title="Refresh"
                onAction={revalidate}
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        ) : null
      }
    />
  );
};

export default Command;
