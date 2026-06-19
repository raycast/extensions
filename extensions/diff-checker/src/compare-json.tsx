import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { DiffDetail } from "./components/DiffDetail";
import { useJSONForm } from "./hooks/useJSONForm";
import { computeDiff } from "./lib/diff";

const Command = () => {
  const { push } = useNavigation();

  const {
    originalValue,
    modifiedValue,
    originalError,
    modifiedError,
    handleSubmit,
    itemProps,
    updateOriginal,
    updateModified,
    formatJSON,
    swapJSON,
    pasteFromClipboard,
  } = useJSONForm((original, modified) => {
    const result = computeDiff(original, modified);
    push(<DiffDetail result={result} />);
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Compare" icon={Icon.MagnifyingGlass} onSubmit={handleSubmit} />
          <Action
            title="Format JSONs"
            icon={Icon.Text}
            onAction={formatJSON}
            shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
          />
          <Action
            title="Swap JSONs"
            icon={Icon.Switch}
            onAction={swapJSON}
            shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
          />
          <Action
            title="Paste Clipboard to Original"
            icon={Icon.Clipboard}
            onAction={() => pasteFromClipboard("original")}
            shortcut={{ modifiers: ["cmd", "shift"], key: "1" }}
          />
          <Action
            title="Paste Clipboard to Modified"
            icon={Icon.Clipboard}
            onAction={() => pasteFromClipboard("modified")}
            shortcut={{ modifiers: ["cmd", "shift"], key: "2" }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Paste two JSON snippets and compare them." />
      <Form.TextArea
        {...itemProps.original}
        title="Original JSON"
        placeholder='{"key": "value"}'
        error={originalError}
        value={originalValue}
        onChange={(val) => {
          updateOriginal(val);
          itemProps.original.onChange?.(val);
        }}
      />
      <Form.Separator />
      <Form.TextArea
        {...itemProps.modified}
        title="Modified JSON"
        placeholder='{"key": "value"}'
        error={modifiedError}
        value={modifiedValue}
        onChange={(val) => {
          updateModified(val);
          itemProps.modified.onChange?.(val);
        }}
      />
    </Form>
  );
};

export default Command;
