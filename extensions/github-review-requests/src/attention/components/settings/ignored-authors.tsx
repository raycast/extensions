import { Action, ActionPanel, Color, Form, Icon, Keyboard, List, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";

import { useConfig, useViewer } from "../../hooks";
import {
  DEFAULT_IGNORED_AUTHORS,
  normalizeAuthor,
  watchedScopeTokens,
  withAuthorIgnored,
  withIgnoredAuthors,
  withoutAuthorIgnored,
} from "../../lib/config";
import { scopeAuthors, type ScopeAuthors } from "../../lib/github";

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
        onChange={value => {
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
  const { data: viewer } = useViewer();

  const ignored = config.ignoredAuthors;
  const ignoredSet = new Set(ignored.map(normalizeAuthor));
  const suggestions = DEFAULT_IGNORED_AUTHORS.filter(a => !ignoredSet.has(a));

  // Who is actually opening pull requests where you look, so the list can be
  // built from real accounts rather than remembered bot names.
  const scope = watchedScopeTokens(config, viewer?.login ?? "");
  const { data: discovered, isLoading } = useCachedPromise(
    async (tokens: string): Promise<ScopeAuthors[]> => (tokens ? scopeAuthors(tokens.split(" ")) : []),
    [scope.join(" ")],
    { initialData: [] as ScopeAuthors[], keepPreviousData: true, execute: Boolean(viewer) },
  );

  const addAction = (
    <Action.Push
      icon={Icon.Plus}
      title="Ignore an Author…"
      shortcut={Keyboard.Shortcut.Common.New}
      target={<AddAuthorForm onAdd={login => update(withAuthorIgnored(config, login))} />}
    />
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Ignored Authors"
      searchBarPlaceholder="Filter ignored authors…"
      actions={<ActionPanel>{addAction}</ActionPanel>}
    >
      <List.EmptyView
        icon={Icon.EyeDisabled}
        title={isLoading ? "Looking for authors in your scope…" : "Nothing is ignored"}
        description="Add a bot account here and its pull requests disappear from every category."
        actions={<ActionPanel>{addAction}</ActionPanel>}
      />

      <List.Section title="Ignored" subtitle={ignored.length ? String(ignored.length) : undefined}>
        {ignored.map(author => (
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

      {discovered.map(({ owner, authors }) => {
        const open = authors.filter(a => !ignoredSet.has(normalizeAuthor(a.login)));
        if (open.length === 0) return null;

        return (
          <List.Section key={owner} title={owner} subtitle={`${open.length} opening PRs`}>
            {open.map(({ login, count }) => (
              <List.Item
                key={`${owner}/${login}`}
                icon={{ source: Icon.Person, tintColor: Color.SecondaryText }}
                title={login}
                accessories={[{ tag: { value: `${count} open`, color: Color.SecondaryText } }]}
                actions={
                  <ActionPanel>
                    <Action
                      icon={Icon.EyeDisabled}
                      title="Ignore This Author"
                      onAction={() => update(withAuthorIgnored(config, login))}
                    />
                    <Action.OpenInBrowser title="Open Profile on GitHub" url={`https://github.com/${login}`} />
                    {addAction}
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        );
      })}

      <List.Section title="Common Bots" subtitle={suggestions.length ? String(suggestions.length) : undefined}>
        {suggestions.map(author => (
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
