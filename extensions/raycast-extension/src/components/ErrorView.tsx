import { Action, ActionPanel, Detail } from "@raycast/api";
import { CliExecutionError } from "../lib/runner";
import { buildDisplayModel } from "../lib/display";

interface ErrorViewProps {
  title: string;
  error: unknown;
  onBack: () => void;
}

export function ErrorView(props: ErrorViewProps) {
  const payload =
    props.error instanceof CliExecutionError
      ? {
          error: props.error.code,
          message: props.error.message,
          details: props.error.details,
        }
      : {
          error: "unknown_error",
          message: props.error instanceof Error ? props.error.message : String(props.error),
        };

  const model = buildDisplayModel(payload);
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
          <Action title="Back" onAction={props.onBack} />
          <Action.CopyToClipboard title="Copy Error JSON" content={model.rawJson} />
        </ActionPanel>
      }
    />
  );
}
