import { Action, ActionPanel, Color, Form, Icon, Keyboard, List, useNavigation } from "@raycast/api";
import { useState } from "react";

import { useConfig } from "../../hooks";
import {
  DEFAULT_IGNORED_AUTHORS,
  normalizeAuthor,
  withAuthorIgnored,
  withIgnoredAuthors,
  withoutAuthorIgnored,
} from "../../lib/config";

/** A one-field form for adding an author to the ignore list. */
function AddAuthorForm({ onAdd }: { onAdd: (login: string) => Promise<void> }) {
  const { pop } = useNavigation();
  const [login, setLogin] = useState("");
  const [error, setError] = useState<string | undefined>();

  return (
    <Form
      navigationTitle="Ignore an Author"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Ignore Author"
            onSubmit={async () => {
              if (!normalizeAuthor(login)) {
                setError("Enter a GitHub login");
                return;
              }
              await onAdd(login);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="PRs opened by this account are hidden from every category. The “[bot]” suffix is optional." />
      <Form.TextField
        id="login"
        title="GitHub Login"
        placeholder="dependabot"
        value={login}
        error={error}
        onChange={(value) => {
          setLogin(value);
          if (error) setError(undefined);
        }}
      />
    </Form>
  );
}

/**
 * Manages the author ignore list — the bots and automation accounts whose PRs
 * never show up. Seeded with the same defaults the TUI ships with.
 */
export function IgnoredAuthors() {
  const { config, update } = useConfig();

  const ignored = config.ignoredAuthors;
  const ignoredSet = new Set(ignored.map(normalizeAuthor));
  const suggestions = DEFAULT_IGNORED_AUTHORS.filter((a) => !ignoredSet.has(a));

  const addAction = (
    <Action.Push
      icon={Icon.Plus}
      title="Ignore an Author…"
      shortcut={Keyboard.Shortcut.Common.New}
      target={<AddAuthorForm onAdd={(login) => update(withAuthorIgnored(config, login))} />}
    />
  );

  return (
    <List
      navigationTitle="Ignored Authors"
      searchBarPlaceholder="Filter ignored authors…"
      actions={<ActionPanel>{addAction}</ActionPanel>}
    >
      <List.EmptyView
        icon={Icon.EyeDisabled}
        title="Nothing is ignored"
        description="Add a bot account here and its pull requests disappear from every category."
        actions={<ActionPanel>{addAction}</ActionPanel>}
      />

      <List.Section title="Ignored" subtitle={ignored.length ? String(ignored.length) : undefined}>
        {ignored.map((author) => (
          <List.Item
            key={author}
            icon={{ source: Icon.EyeDisabled, tintColor: Color.Red }}
            title={author}
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.Eye}
                  title="Stop Ignoring"
                  onAction={() => update(withoutAuthorIgnored(config, author))}
                />
                {addAction}
                <Action
                  icon={Icon.ArrowCounterClockwise}
                  title="Restore Default Ignore List"
                  onAction={() => update(withIgnoredAuthors(config, DEFAULT_IGNORED_AUTHORS))}
                />
                <Action
                  icon={Icon.Trash}
                  title="Clear the Ignore List"
                  style={Action.Style.Destructive}
                  onAction={() => update(withIgnoredAuthors(config, []))}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Common Bots" subtitle={suggestions.length ? String(suggestions.length) : undefined}>
        {suggestions.map((author) => (
          <List.Item
            key={author}
            icon={{ source: Icon.Circle, tintColor: Color.SecondaryText }}
            title={author}
            accessories={[{ tag: { value: "suggested", color: Color.SecondaryText } }]}
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.EyeDisabled}
                  title="Ignore This Author"
                  onAction={() => update(withAuthorIgnored(config, author))}
                />
                {addAction}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
