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

/**
 * Copy snippet command. Shows a list of languages to open snippets
 */
export default function Command() {
  const { data: languages, isLoading } = useFetch<Language[]>(languagesUrl);

  return (
    <List isLoading={isLoading}>
      {languages?.map((l) => (
        <List.Item
          key={l.name}
          icon={{ source: iconUrlForLanguage(l.name) }}
          title={l.name}
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
  const { data: categories, isLoading } = useFetch<Category[]>(categoriesUrlForLanguage(language.name));

  return (
    <List navigationTitle={`Search for ${language.name} snippets`} isShowingDetail isLoading={isLoading}>
      {categories?.map((category) => (
        <List.Section title={category.name} key={category.name}>
          {category.snippets.map((snippet) => (
            <List.Item
              key={category.name + snippet.title}
              title={snippet.title}
              keywords={snippet.tags}
              detail={<List.Item.Detail markdown={markdownForSnippet(snippet, language)} />}
              actions={
                <ActionPanel>
                  <Action.Paste content={snippet.code} />
                  <Action.CopyToClipboard content={snippet.code} />
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
  \`\`\`${language.name}
  ${snippet.code}
  \`\`\`

  _Made by [${snippet.author}](https://github.com/${snippet.author})_
  `;
}
