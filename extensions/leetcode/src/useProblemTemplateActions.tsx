import { Action, ActionPanel, getPreferenceValues, Icon } from '@raycast/api';
import { useMemo } from 'react';
import { CodeSnippet } from './types';

type Props = {
  codeSnippets?: CodeSnippet[];
  problemMarkdown: string;
  isPaidOnly?: boolean;
  linkUrl: string;
};

export function useProblemTemplateActions({ codeSnippets, problemMarkdown, isPaidOnly, linkUrl }: Props) {
  const preferences = getPreferenceValues<Preferences>();

  const sortedSnippets = useMemo(() => {
    if (!codeSnippets) return [];

    return [...codeSnippets].sort((a, b) => {
      const aIsDefault = a.langSlug === preferences.defaultLanguage;
      const bIsDefault = b.langSlug === preferences.defaultLanguage;

      if (aIsDefault && !bIsDefault) return -1;
      if (!aIsDefault && bIsDefault) return 1;

      return a.lang.localeCompare(b.lang);
    });
  }, [codeSnippets, preferences.defaultLanguage]);

  return (
    <ActionPanel>
      <Action.OpenInBrowser title="Open in Browser" url={linkUrl} />
      <Action.CopyToClipboard title="Copy Link to Clipboard" content={linkUrl} />
      {!isPaidOnly && (
        <Action.CopyToClipboard
          title="Copy Problem to Clipboard"
          content={problemMarkdown}
          shortcut={{ modifiers: ['cmd'], key: 'c' }}
        />
      )}
      {sortedSnippets.length > 0 && (
        <ActionPanel.Submenu title="Copy Code Template" icon={Icon.CodeBlock}>
          {sortedSnippets.map((snippet) => (
            <Action.CopyToClipboard
              key={snippet.langSlug}
              title={`${snippet.langSlug === preferences.defaultLanguage ? '⭐ ' : ''}${snippet.lang} Code`}
              content={snippet.code}
            />
          ))}
        </ActionPanel.Submenu>
      )}
    </ActionPanel>
  );
}
