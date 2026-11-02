import { Action, ActionPanel, Color, Form, Icon, List, useNavigation } from "@raycast/api";
import { useState } from "react";
import { keepConflict, reviewSnippets, updateSnippet } from "../lib/migration";
import type { MigrationSession, PreviewSnippet, RaycastSnippet } from "../lib/types";
import { textPreview } from "./shared";

export function EditSnippetForm({ item, onSave }: { item: PreviewSnippet; onSave: (snippet: RaycastSnippet) => void }) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string>();
  const [textError, setTextError] = useState<string>();
  function save(values: { name: string; keyword: string; text: string }) {
    setNameError(values.name.trim() ? undefined : "Enter a snippet name.");
    setTextError(values.text.length ? undefined : "Enter snippet text. Whitespace is allowed.");
    if (!values.name.trim() || !values.text.length) return;
    onSave({ name: values.name.trim(), text: values.text, ...(values.keyword ? { keyword: values.keyword } : {}) });
    pop();
  }
  return (
    <Form
      navigationTitle="Edit Snippet"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" icon={Icon.CheckCircle} onSubmit={save} />
        </ActionPanel>
      }
    >
      <Form.Description text="Changes apply to this migration. Source files stay untouched. Warnings and keyword conflicts are checked again after saving." />
      <Form.TextField
        id="name"
        title="Name"
        defaultValue={item.snippet.name}
        error={nameError}
        onChange={() => setNameError(undefined)}
      />
      <Form.TextField
        id="keyword"
        title="Keyword"
        defaultValue={item.snippet.keyword ?? ""}
        info="Leave empty to use the snippet through Search Snippets."
      />
      <Form.TextArea
        id="text"
        title="Text"
        defaultValue={item.snippet.text}
        error={textError}
        onChange={() => setTextError(undefined)}
      />
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
  const [error, setError] = useState<string>();
  return (
    <Form
      navigationTitle="Rename Group"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Group Name"
            icon={Icon.CheckCircle}
            onSubmit={(values: { name: string }) => {
              if (!values.name.trim()) {
                setError("Enter a group name.");
                return;
              }
              onSave(values.name.trim());
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text={`Rename the group “${group}” for this migration. Existing [Group] name prefixes are updated when group prefixes are enabled. Custom names without that prefix are kept.`}
      />
      <Form.TextField
        id="name"
        title="Group Name"
        defaultValue={currentName}
        error={error}
        onChange={() => setError(undefined)}
      />
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
