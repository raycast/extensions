import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { kbbiWebsiteUrl, Lemma, lemmaUrl, parseLemmaResponse } from "../api";
import { lemmaToMarkdown, lemmaToPlainText, uniqueLabels } from "../markdown";

const MAX_SUBMENU_ITEMS = 200;

interface RelatedGroup {
  title: string;
  icon: Icon;
  words: string[];
}

function relatedGroups(lemma: Lemma): RelatedGroup[] {
  const collect = (pick: (entry: Lemma["entries"][number]) => string[]) => [
    ...new Set(lemma.entries.flatMap(pick).filter((word) => word && word !== lemma.lemma)),
  ];

  return [
    {
      title: "Base and Referenced Words",
      icon: Icon.ArrowUp,
      words: collect((entry) => [entry.baseWord, ...entry.definitions.map((def) => def.referencedLemma)]),
    },
    { title: "Derived Words", icon: Icon.Tree, words: collect((entry) => entry.derivedWords) },
    { title: "Compound Words", icon: Icon.Link, words: collect((entry) => entry.compoundWords) },
    {
      title: "Variants",
      icon: Icon.Shuffle,
      words: collect((entry) => [...entry.variants, ...entry.nonStandardWords]),
    },
  ].filter((group) => group.words.length > 0);
}

export default function WordDetail({ word }: { word: string }) {
  const { data, isLoading, error } = useFetch(lemmaUrl(word), {
    parseResponse: parseLemmaResponse,
    keepPreviousData: false,
  });

  let markdown = "";
  if (data) {
    markdown = lemmaToMarkdown(data);
  } else if (data === null) {
    markdown = `# ${word}\n\nThis word was not found in KBBI.`;
  } else if (error) {
    markdown = `# ${word}\n\nCould not load the definition.\n\n\`${error.message}\``;
  }

  const labels = data ? uniqueLabels(data) : [];

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={word}
      markdown={markdown}
      metadata={
        labels.length > 0 ? (
          <Detail.Metadata>
            {labels.map((label) => (
              <Detail.Metadata.Label key={label.code} title={label.code} text={`${label.name} (${label.kind})`} />
            ))}
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {data && <Action.CopyToClipboard title="Copy Definitions" content={lemmaToPlainText(data)} />}
            <Action.CopyToClipboard title="Copy Word" content={word} shortcut={Keyboard.Shortcut.Common.Copy} />
            <Action.OpenInBrowser title="Open in KBBI Website" url={kbbiWebsiteUrl(word)} />
          </ActionPanel.Section>
          {data && (
            <ActionPanel.Section title="Related Words">
              {relatedGroups(data).map((group) => (
                <ActionPanel.Submenu key={group.title} title={`${group.title}…`} icon={group.icon}>
                  {group.words.slice(0, MAX_SUBMENU_ITEMS).map((related) => (
                    <Action.Push
                      key={related}
                      title={related}
                      icon={Icon.Book}
                      target={<WordDetail word={related} />}
                    />
                  ))}
                </ActionPanel.Submenu>
              ))}
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}
