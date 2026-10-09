import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { addAlias, countQueryMatches } from "./api";

function pages(count: number): string {
  return `${count.toLocaleString()} page${count === 1 ? "" : "s"}`;
}

export function AddAliasForm({ existing, onDone }: { existing: Record<string, string>; onDone: () => void }) {
  const { pop } = useNavigation();
  const [keyword, setKeyword] = useState("");
  const [query, setQuery] = useState("");
  const abortable = useRef<AbortController>(null);
  const word = keyword.trim();
  const expansion = query.trim();

  // Hister swaps whole words of a search for aliases, so a keyword with a space never matches.
  const keywordError = /\s/.test(word) ? "One word, no spaces." : undefined;
  const replaces = word && existing[word];

  const {
    data: matched,
    isLoading: counting,
    error: countError,
  } = usePromise((value: string) => countQueryMatches(value, abortable.current?.signal), [expansion], {
    execute: Boolean(expansion),
    abortable,
    onError: () => undefined,
  });

  const matchText =
    !expansion || countError
      ? undefined
      : counting || matched === undefined
        ? "Counting matching pages…"
        : `Matches ${pages(matched)}.`;

  const submit = async () => {
    if (!word || !expansion || keywordError) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Saving alias" });
    try {
      await addAlias(word, expansion);
      toast.style = Toast.Style.Success;
      toast.title = replaces ? `Updated "${word}"` : `Added "${word}"`;
      onDone();
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not save alias";
      toast.message = error instanceof Error ? error.message : undefined;
    }
  };

  return (
    <Form
      navigationTitle="Add Alias"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Alias" icon={Icon.Check} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description text="A query like `gh raycast` would expand to `domain:github.com raycast`." />
      <Form.TextField
        id="keyword"
        title="Keyword"
        placeholder="gh"
        value={keyword}
        error={keywordError}
        onChange={setKeyword}
      />
      {replaces && <Form.Description text={`Replaces the current "${word}" alias: ${replaces}`} />}
      <Form.TextField
        id="query"
        title="Query"
        placeholder="domain:github.com"
        value={query}
        error={countError?.message}
        onChange={setQuery}
      />
      {matchText && <Form.Description text={matchText} />}
    </Form>
  );
}
