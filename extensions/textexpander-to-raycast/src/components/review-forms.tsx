import { Action, ActionPanel, Color, Form, Icon, List, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useState } from "react";
import { keepConflict, reviewSnippets, updateSnippet } from "../lib/migration";
import type { MigrationSession, PreviewSnippet, RaycastSnippet } from "../lib/types";
import { textPreview } from "./shared";

export function EditSnippetForm({ item, onSave }: { item: PreviewSnippet; onSave: (snippet: RaycastSnippet) => void }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<RaycastSnippet & { keyword: string }>({
    initialValues: { ...item.snippet, keyword: item.snippet.keyword ?? "" },
    validation: {
      name: (value) => (value?.trim() ? undefined : "Enter a snippet name."),
      text: FormValidation.Required,
    },
    onSubmit(values) {
      onSave({ name: values.name.trim(), text: values.text, ...(values.keyword ? { keyword: values.keyword } : {}) });
      pop();
    },
  });
  return (
    <Form
      navigationTitle="Edit Snippet"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" icon={Icon.CheckCircle} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Changes apply to this migration. Source files stay untouched. Warnings and keyword conflicts are checked again after saving." />
      <Form.TextField title="Name" placeholder="Email signature" {...itemProps.name} />
      <Form.TextField
        title="Keyword"
        placeholder=";signature"
        {...itemProps.keyword}
        info="Leave empty to use the snippet through Search Snippets."
      />
      <Form.TextArea title="Text" placeholder="Best regards, Example" {...itemProps.text} />
    </Form>
  );
}

export function GroupNameForm({
  group,
  currentName,
  onSave,
}: {
  group: string;
  currentName: string;
  onSave: (name: string) => void;
}) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ name: string }>({
    initialValues: { name: currentName },
    validation: { name: (value) => (value?.trim() ? undefined : "Enter a group name.") },
    onSubmit(values) {
      onSave(values.name.trim());
      pop();
    },
  });
  return (
    <Form
      navigationTitle="Rename Group"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Group Name" icon={Icon.CheckCircle} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        text={`Rename the group “${group}” for this migration. Existing [Group] name prefixes are updated when group prefixes are enabled. Custom names without that prefix are kept.`}
      />
      <Form.TextField title="Group Name" placeholder="Work" {...itemProps.name} />
    </Form>
  );
}

export function ConflictResolver({
  initialSession,
  keyword,
  onChange,
}: {
  initialSession: MigrationSession;
  keyword: string;
  onChange: (session: MigrationSession) => void;
}) {
  const { pop } = useNavigation();
  const [session, setSession] = useState(initialSession);
  const items = reviewSnippets(session).filter((item) => item.snippet.keyword === keyword);
  const existing = session.existing.filter((item) => item.keyword === keyword);
  function commit(next: MigrationSession) {
    setSession(next);
    onChange(next);
  }
  return (
    <List
      navigationTitle={`Keyword: ${keyword}`}
      isShowingDetail
      searchBarPlaceholder="Compare snippets sharing this keyword..."
    >
      <List.Section title="Migration Snippets" subtitle="Choose one to keep, or edit its keyword">
        {items.map((item) => (
          <List.Item
            key={item.id}
            title={item.snippet.name}
            subtitle={item.group}
            icon={{
              source: session.selectedIds.includes(item.id) ? Icon.CheckCircle : Icon.Circle,
              tintColor: Color.Green,
            }}
            detail={<List.Item.Detail markdown={textPreview(item.snippet.text)} />}
            actions={
              <ActionPanel>
                <Action
                  title="Keep Only This Migration Snippet"
                  icon={Icon.CheckCircle}
                  onAction={() => {
                    commit(keepConflict(session, keyword, item.id));
                    pop();
                  }}
                />
                <Action.Push
                  title="Edit Snippet"
                  icon={Icon.Pencil}
                  target={
                    <EditSnippetForm
                      item={item}
                      onSave={(snippet) => commit(updateSnippet(session, item.id, snippet))}
                    />
                  }
                />
                {existing.length > 0 && (
                  <Action
                    title="Keep Existing Snippets"
                    icon={Icon.MinusCircle}
                    onAction={() => {
                      commit(keepConflict(session, keyword));
                      pop();
                    }}
                  />
                )}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {existing.length > 0 && (
        <List.Section title="Existing Raycast Export" subtitle="Your live Raycast library is not changed">
          {existing.map((snippet, index) => (
            <List.Item
              key={`existing-${index}`}
              title={snippet.name}
              icon={Icon.Document}
              detail={
                <List.Item.Detail
                  markdown={`Keeping a migration snippet does not overwrite existing Raycast snippets. Rename its keyword to avoid the conflict.\n\n${textPreview(snippet.text)}`}
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Keep Existing Snippets"
                    icon={Icon.CheckCircle}
                    onAction={() => {
                      commit(keepConflict(session, keyword));
                      pop();
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
