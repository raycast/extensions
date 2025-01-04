import { ActionPanel, List, Action } from "@raycast/api";
import {
  Category,
  iconUrlForLanguage,
  Language,
  snippetUrlForLanguage as categoriesUrlForLanguage,
  languagesUrl,
  Snippet,
} from "./api";
import { useFetch } from "@raycast/utils";
import { Clipboard } from "@raycast/api";
import { showHUD } from "@raycast/api";

/**
 * Copy snippet command. Shows a list of languages to open snippets
 */
export default function Command() {
  const { data: languages } = useFetch<Language[]>(languagesUrl);

  return (
    <List>
      {languages?.map((l) => (
        <List.Item
          key={l.lang}
          icon={{ source: iconUrlForLanguage(l.lang) }}
          title={l.lang}
          actions={
            <ActionPanel>
              <Action.Push title="Snippets" target={<LanguageSnippets language={l} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

/**
 * Component that displays all snippets for a given language
 * divided by categories, with an action to copy the snippet to the user's clipboard.
 * @returns
 */
function LanguageSnippets({ language }: { language: Language }) {
  const { data: categories } = useFetch<Category[]>(categoriesUrlForLanguage(language.lang));

  return (
    <List navigationTitle={`Search for ${language.lang} snippets`} isShowingDetail>
      {categories?.map((category) => (
        <List.Section title={category.categoryName} key={category.categoryName}>
          {category.snippets.map((snippet) => (
            <List.Item
              key={snippet.title}
              title={snippet.title}
              keywords={snippet.tags}
              detail={<List.Item.Detail markdown={markdownForSnippet(snippet, language)} />}
              actions={
                <ActionPanel>
                  <Action
                    title="Copy to Clipboard"
                    onAction={async () => {
                      await Clipboard.copy(snippet.code);
                      await showHUD("📋 Snippet copied to clipboard!");
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

/**
 * Generate markdown for the details view of a snippet
 */
function markdownForSnippet(snippet: Snippet, language: Language): string {
  return `
  # ${snippet.title}
  ${snippet.description}
  \`\`\`${language.lang}
  ${snippet.code}
  \`\`\`

  _Made by [${snippet.author}](https://github.com/${snippet.author})_
  `;
}
