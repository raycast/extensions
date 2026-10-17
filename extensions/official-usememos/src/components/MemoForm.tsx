import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { MEMO_VISIBILITIES } from "../api/memo";
import type { MemoFormState } from "../hooks/useMemoForm";
import { MemoPreview } from "./MemoPreview";

const VISIBILITY_TITLES: Record<(typeof MEMO_VISIBILITIES)[number], string> = {
  PRIVATE: "Private",
  PROTECTED: "Protected",
  PUBLIC: "Public",
};

type Props = { navigationTitle: string; submitTitle: string; form: MemoFormState };

export const MemoForm = ({ navigationTitle, submitTitle, form: { handleSubmit, itemProps, values } }: Props) => (
  <Form
    navigationTitle={navigationTitle}
    actions={
      <ActionPanel>
        <Action.SubmitForm title={submitTitle} icon={Icon.SaveDocument} onSubmit={handleSubmit} />
        <Action.Push
          title="Preview"
          icon={Icon.Eye}
          shortcut={{ macOS: { modifiers: ["cmd"], key: "p" }, Windows: { modifiers: ["ctrl"], key: "p" } }}
          target={<MemoPreview markdown={values.content} />}
        />
      </ActionPanel>
    }
  >
    <Form.TextArea {...itemProps.content} title="Memo" placeholder="Write in Markdown…" enableMarkdown autoFocus />
    <Form.Dropdown {...itemProps.visibility} title="Visibility">
      {MEMO_VISIBILITIES.map((visibility) => (
        <Form.Dropdown.Item key={visibility} value={visibility} title={VISIBILITY_TITLES[visibility]} />
      ))}
    </Form.Dropdown>
  </Form>
);
