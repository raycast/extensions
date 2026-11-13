import { Action, ActionPanel, getPreferenceValues, Icon } from '@raycast/api';
import { useMemo } from 'react';
import { CodeSnippet } from './types';

type Props = {
  codeSnippets?: CodeSnippet[];
  problemMarkdown: string;
  isPaidOnly?: boolean;
  // Undefined until the problem has loaded, so no half-built URL is offered.
  linkUrl?: string;
};

// Earlier versions stored "go", but LeetCode's langSlug for Go is "golang".
function normalizeLanguage(language: string): string {
  return language === 'go' ? 'golang' : language;
}

export function useProblemTemplateActions({ codeSnippets, problemMarkdown, isPaidOnly, linkUrl }: Props) {
  const preferences = getPreferenceValues<Preferences>();
  const preferredLanguage = normalizeLanguage(preferences.defaultLanguage);

  const sortedSnippets = useMemo(() => {
    if (!codeSnippets) return [];

    return [...codeSnippets].sort((a, b) => {
      const aIsDefault = a.langSlug === preferredLanguage;
      const bIsDefault = b.langSlug === preferredLanguage;

      if (aIsDefault && !bIsDefault) return -1;
      if (!aIsDefault && bIsDefault) return 1;

      return a.lang.localeCompare(b.lang);
    });
  }, [codeSnippets, preferredLanguage]);

  return (
    <ActionPanel>
      {linkUrl && (
        <>
          <Action.OpenInBrowser title="Open in Browser" url={linkUrl} />
          <Action.CopyToClipboard title="Copy Link to Clipboard" content={linkUrl} />
        </>
      )}
      {!isPaidOnly && problemMarkdown && (
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
              title={`${snippet.langSlug === preferredLanguage ? '⭐ ' : ''}${snippet.lang}`}
              content={snippet.code}
            />
          ))}
        </ActionPanel.Submenu>
      )}
    </ActionPanel>
  );
}
