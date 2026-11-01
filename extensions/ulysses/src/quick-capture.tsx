import { Action, ActionPanel, Form, Icon, LaunchProps, popToRoot, showHUD } from "@raycast/api";
import { createDeeplink, useForm } from "@raycast/utils";
import { saveSheetUrl, sheetText, TextFormat } from "./ulysses-url";
import { getPreferences, groupLabel, openUlyssesCallback } from "./utils";

interface Values {
  title: string;
  text: string;
  group: string;
  format: string;
}

export default function QuickCapture(props: LaunchProps<{ launchContext: { group?: string } }>) {
  const preferences = getPreferences();
  const { handleSubmit, itemProps, values } = useForm<Values>({
    initialValues: {
      group: props.launchContext?.group ?? preferences.defaultGroup ?? "",
      format: preferences.format,
    },
    validation: {
      text: (value): string | undefined =>
        !value?.trim() && !values.title?.trim() ? "Add a title or some text" : undefined,
    },
    async onSubmit(form) {
      const format = form.format as TextFormat;
      const background = !preferences.showInUlysses;
      const url = saveSheetUrl({
        text: sheetText(form.title, form.text, format),
        group: form.group,
        format,
        silent: background,
      });
      if (await openUlyssesCallback(url, { background })) {
        await showHUD("Saved to Ulysses");
        await popToRoot();
      }
    },
  });

  const group = values.group?.trim() ?? "";

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save to Ulysses" icon={Icon.SaveDocument} onSubmit={handleSubmit} />
          <Action.CreateQuicklink
            title="Create Quicklink for Group"
            shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
            quicklink={{
              name: `Capture to ${groupLabel(group)}`,
              link: createDeeplink({ command: "quick-capture", context: { group } }),
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" placeholder="Untitled" {...itemProps.title} />
      <Form.TextArea title="Text" placeholder="Start writing…" enableMarkdown autoFocus {...itemProps.text} />
      <Form.Separator />
      <Form.TextField
        title="Group"
        placeholder="Inbox"
        info="A group name or a path like /Blog/Drafts. Leave empty, or use a group that doesn't exist, to save to the Inbox."
        {...itemProps.group}
      />
      <Form.Dropdown title="Format" {...itemProps.format}>
        <Form.Dropdown.Item value="markdown" title="Markdown" />
        <Form.Dropdown.Item value="text" title="Plain Text" />
      </Form.Dropdown>
    </Form>
  );
}
