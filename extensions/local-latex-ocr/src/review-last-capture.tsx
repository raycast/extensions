import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  environment,
  Form,
  getPreferenceValues,
  Icon,
  Keyboard,
  LaunchProps,
  launchCommand,
  LaunchType,
  popToRoot,
  showHUD,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { pathToFileURL } from "node:url";
import { deliverLatex } from "./lib/deliver";
import { formatLatex } from "./lib/output";
import { discardReview, loadReview } from "./lib/review-store";
import type { ReviewRecord } from "./types";

export default function ReviewLastCapture({
  launchContext = {},
}: LaunchProps<{ launchContext?: { requestId?: string } }>) {
  const [record, setRecord] = useState<ReviewRecord>();
  const [loaded, setLoaded] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    void loadReview(environment.supportPath, launchContext.requestId).then((value) => {
      setRecord(value);
      setLoaded(true);
    });
  }, []);

  if (!loaded) return <Detail isLoading markdown="Loading the latest capture…" />;
  if (!record) {
    return <Detail markdown="# No Capture to Review\n\nRun one of the three capture commands first." />;
  }

  const imageUrl = pathToFileURL(record.imagePath).href;
  const markdown = [
    "# Review LaTeX",
    `![Captured equation](${imageUrl})`,
    "## Rendered Result",
    `$$\n${record.result.latex}\n$$`,
    "## Raw LaTeX",
    `\`\`\`latex\n${record.result.latex}\n\`\`\``,
  ].join("\n\n");

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Paste LaTeX" icon={Icon.Clipboard} onAction={() => void pasteRecord(record)} />
          <Action
            title="Edit LaTeX"
            icon={Icon.Pencil}
            shortcut={Keyboard.Shortcut.Common.Edit}
            onAction={() => navigation.push(<EditLatexForm record={record} />)}
          />
          <Action
            title="Copy LaTeX"
            icon={Icon.CopyClipboard}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
            onAction={() => void copyRecord(record)}
          />
          <Action
            title="Recapture"
            icon={Icon.Repeat}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={() => void recapture(record)}
          />
          <Action
            title="Discard"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={() => void discard(record)}
          />
        </ActionPanel>
      }
    />
  );
}

function EditLatexForm({ record }: { record: ReviewRecord }) {
  const preferences = getPreferenceValues<Preferences>();
  return (
    <Form
      navigationTitle="Edit LaTeX"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save and Deliver"
            icon={Icon.Checkmark}
            onSubmit={(values: { latex: string }) =>
              void (async () => {
                const deliveryPreferences =
                  preferences.copyToClipboard || preferences.pasteAutomatically
                    ? preferences
                    : { ...preferences, copyToClipboard: true };
                await deliverLatex(values.latex, record.outputMode, deliveryPreferences);
                await discardReview(environment.supportPath, record);
                await popToRoot();
                await showHUD("Edited LaTeX ready");
              })()
            }
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="latex" title="LaTeX" defaultValue={record.result.latex} autoFocus />
      <Form.Description text={`Output style: ${record.outputMode}`} />
    </Form>
  );
}

async function pasteRecord(record: ReviewRecord): Promise<void> {
  await Clipboard.copy(formatLatex(record.result.latex, record.outputMode));
  await Clipboard.paste(formatLatex(record.result.latex, record.outputMode));
  await discardReview(environment.supportPath, record);
  await popToRoot();
}

async function copyRecord(record: ReviewRecord): Promise<void> {
  await Clipboard.copy(formatLatex(record.result.latex, record.outputMode));
  await discardReview(environment.supportPath, record);
  await popToRoot();
  await showHUD("LaTeX copied");
}

async function recapture(record: ReviewRecord): Promise<void> {
  await discardReview(environment.supportPath, record);
  await popToRoot();
  await launchCommand({ name: record.commandName, type: LaunchType.UserInitiated });
}

async function discard(record: ReviewRecord): Promise<void> {
  await discardReview(environment.supportPath, record);
  await popToRoot();
  await showHUD("Capture discarded");
}
