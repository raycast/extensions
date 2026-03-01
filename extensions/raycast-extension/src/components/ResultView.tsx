import { ActionPanel, Action, Detail } from "@raycast/api";
import { buildDisplayModel } from "../lib/display";

interface ResultViewProps {
  title: string;
  data: unknown;
  onBack: () => void;
}

export function ResultView(props: ResultViewProps) {
  const model = buildDisplayModel(props.data);
  const metadata =
    model.metadataRows.length > 0 ? (
      <Detail.Metadata>
        {model.metadataRows.map((row, index) => (
          <Detail.Metadata.Label key={`${row.title}-${index}`} title={row.title} text={row.text} />
        ))}
      </Detail.Metadata>
    ) : undefined;

  return (
    <Detail
      markdown={model.markdown}
      navigationTitle={props.title}
      metadata={metadata}
      actions={
        <ActionPanel>
          <Action title="Run Again" onAction={props.onBack} />
          <Action.CopyToClipboard title="Copy JSON" content={model.rawJson} />
        </ActionPanel>
      }
    />
  );
}
