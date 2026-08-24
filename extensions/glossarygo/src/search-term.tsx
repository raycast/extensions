import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import type { ReactElement } from "react";

import { showFailureToast } from "@raycast/utils";
import { useGlossary, type CommandState } from "./hooks/use-glossary";
import type { SearchResult } from "./search";
import { copyWithFeedback } from "./utils/copy-with-feedback";
import { renderPlainTextAsMarkdown } from "./utils/render-plain-text-as-markdown";
import type { Term } from "./utils/types";

const runAction = (action: () => Promise<unknown>, failureTitle: string): void => {
  action().catch((error: unknown) => showFailureToast(error, { title: failureTitle }));
};

const ReloadAction = ({ onReload }: Readonly<{ onReload: () => Promise<void> }>): ReactElement => {
  return (
    <Action
      title="Reload Glossary"
      icon={Icon.ArrowClockwise}
      onAction={() => runAction(onReload, "Failed to Reload Glossary")}
    />
  );
};

const RecoveryActions = ({ onReload }: Readonly<{ onReload: () => Promise<void> }>): ReactElement => {
  return (
    <ActionPanel>
      <ReloadAction onReload={onReload} />
      <Action
        title="Open Extension Preferences"
        icon={Icon.Gear}
        onAction={() => runAction(openExtensionPreferences, "Failed to Open Extension Preferences")}
      />
    </ActionPanel>
  );
};

const TermActions = ({ term, onReload }: Readonly<{ term: Term; onReload: () => Promise<void> }>): ReactElement => {
  return (
    <ActionPanel>
      <Action
        title="Copy Definition"
        icon={Icon.Clipboard}
        onAction={() => runAction(() => copyWithFeedback(term.definition, "Definition"), "Failed to Copy Definition")}
      />
      <Action
        title="Copy Term"
        icon={Icon.Clipboard}
        onAction={() => runAction(() => copyWithFeedback(term.term, "Term"), "Failed to Copy Term")}
      />
      <ActionPanel.Section>
        <ReloadAction onReload={onReload} />
      </ActionPanel.Section>
    </ActionPanel>
  );
};

const ResultSection = ({
  onReload,
  result,
}: Readonly<{ onReload: () => Promise<void>; result: SearchResult }>): ReactElement => {
  return (
    <List.Section {...(result.totalMatchCount > 5 ? { title: `Showing 5 of ${result.totalMatchCount} matches` } : {})}>
      {result.terms.map((term) => (
        <List.Item
          key={term.term}
          id={term.term}
          title={term.term}
          detail={<List.Item.Detail markdown={renderPlainTextAsMarkdown(term.definition)} />}
          actions={<TermActions term={term} onReload={onReload} />}
        />
      ))}
    </List.Section>
  );
};

const CommandContent = ({
  onReload,
  result,
  state,
}: Readonly<{ onReload: () => Promise<void>; result: SearchResult; state: CommandState }>): ReactElement | null => {
  if (state.status === "error") {
    return (
      <List.EmptyView
        title="Glossary Could Not Be Loaded"
        description={state.message}
        actions={<RecoveryActions onReload={onReload} />}
      />
    );
  }

  if (state.status === "loading") {
    return null;
  }

  if (state.terms.length === 0) {
    return (
      <List.EmptyView
        title="No Terms in Glossary"
        description="Add terms to the selected glossary file, then reload it."
        actions={<RecoveryActions onReload={onReload} />}
      />
    );
  }

  if (result.totalMatchCount === 0) {
    return (
      <List.EmptyView
        title="No Matching Terms"
        description="Try a shorter or different prefix."
        actions={
          <ActionPanel>
            <ReloadAction onReload={onReload} />
          </ActionPanel>
        }
      />
    );
  }

  return <ResultSection onReload={onReload} result={result} />;
};

export default function Command(): ReactElement {
  const { query, reload, result, setQuery, state } = useGlossary();

  return (
    <List
      filtering={false}
      isLoading={state.status === "loading"}
      isShowingDetail={state.status === "ready" && result.terms.length > 0}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search terms by prefix"
      searchText={query}
    >
      <CommandContent onReload={reload} result={result} state={state} />
    </List>
  );
}
