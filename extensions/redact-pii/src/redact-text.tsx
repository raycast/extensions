import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import type { Redaction } from "@desert-ant-labs/redact";
import { redactText, summarize } from "./redact";

export default function Command() {
  const { push } = useNavigation();
  // Prefill with the clipboard; if it can't be read, start with an empty form.
  const { data: initialText, isLoading } = usePromise(
    async () => (await Clipboard.readText()) ?? "",
    [],
    { failureToastOptions: { title: "Could not read the clipboard" } },
  );

  async function handleSubmit({ text }: { text: string }) {
    if (!text.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Enter some text first",
      });
      return;
    }
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Redacting…",
    });
    try {
      const redaction = await redactText(text);
      await toast.hide();
      push(<RedactionResult redaction={redaction} />);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Redaction failed";
      toast.message = String(error);
    }
  }

  if (isLoading) return <Form isLoading />;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Redact"
            icon={Icon.EyeDisabled}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="Text"
        placeholder="Paste text containing personal data"
        defaultValue={initialText ?? ""}
      />
    </Form>
  );
}

function RedactionResult({ redaction }: { redaction: Redaction }) {
  const markdown = `## ${summarize(redaction)}\n\n\`\`\`\n${redaction.redactedText}\n\`\`\``;

  return (
    <Detail
      markdown={markdown}
      metadata={
        redaction.items.length > 0 ? (
          <Detail.Metadata>
            {redaction.items.map((item) => (
              <Detail.Metadata.Label
                key={item.placeholder}
                title={item.placeholder}
                text={`${item.original} (${Math.round(item.confidence * 100)}%)`}
              />
            ))}
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Redacted Text"
            content={redaction.redactedText}
          />
          <Action.Paste
            title="Paste Redacted Text"
            content={redaction.redactedText}
          />
          <Action.CopyToClipboard
            title="Copy Placeholder Mapping"
            content={JSON.stringify(
              Object.fromEntries(
                redaction.items.map((i) => [i.placeholder, i.original]),
              ),
              null,
              2,
            )}
            shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
          />
        </ActionPanel>
      }
    />
  );
}
