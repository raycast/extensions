import { Action, ActionPanel, AI, Detail, getPreferenceValues, Icon, LaunchProps } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { ArchivedArticle, normalizeArticleRetention, refreshArticleArchive } from "./article-archive";
import { getTranslations, Translations } from "./i18n";

type AskArguments = {
  question: string;
};

type ArchivePreferences = {
  archiveRetention?: string;
  language?: string;
};

type AskResult = {
  answer: string;
  sources: ArchivedArticle[];
};

const MAX_SOURCES = 8;
const MAX_ARTICLE_CHARACTERS = 3_500;
const STOP_WORDS = new Set([
  "aber",
  "alle",
  "auch",
  "das",
  "dem",
  "den",
  "der",
  "die",
  "ein",
  "eine",
  "einer",
  "eines",
  "für",
  "hat",
  "ist",
  "mit",
  "nach",
  "oder",
  "sind",
  "und",
  "von",
  "was",
  "welche",
  "welcher",
  "wie",
  "wurde",
  "wurden",
  "zum",
  "zur",
  "the",
  "and",
  "for",
  "from",
  "that",
  "this",
  "what",
  "which",
  "with",
]);

export default function AskTechgedoensCommand(props: LaunchProps<{ arguments: AskArguments }>) {
  const question = props.arguments.question.trim();
  const preferences = getPreferenceValues<ArchivePreferences>();
  const translations = getTranslations(preferences.language);
  const retention = normalizeArticleRetention(preferences.archiveRetention);
  const { data, error, isLoading, revalidate } = useCachedPromise(answerQuestion, [question, retention, translations], {
    failureToastOptions: {
      title: translations.askFailedTitle,
      message: translations.askUnavailableMessage,
    },
  });

  const errorMessage =
    error?.message === translations.emptyArchive ? error.message : translations.askUnavailableMessage;
  const markdown = error
    ? `# ${translations.noAnswerHeading}\n\n${escapeMarkdown(errorMessage)}\n\n${translations.askRequiresArchive}`
    : data
      ? `${data.answer}\n\n---\n\n## ${translations.usedArticles}\n\n${formatSources(data.sources)}`
      : `# Ask Techgedöns\n\n${translations.searchingArchive}`;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="Ask Techgedöns"
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title={translations.regenerateAnswer} icon={Icon.RotateClockwise} onAction={revalidate} />
          {data ? <Action.CopyToClipboard title={translations.copyAnswer} content={data.answer} /> : null}
        </ActionPanel>
      }
    />
  );
}

async function answerQuestion(
  question: string,
  retention: ReturnType<typeof normalizeArticleRetention>,
  translations: Translations,
): Promise<AskResult> {
  const articles = await refreshArticleArchive(retention);
  if (articles.length === 0) {
    throw new Error(translations.emptyArchive);
  }

  const sources = selectRelevantArticles(articles, question);
  const answer = await AI.ask(buildPrompt(question, sources, translations), { creativity: "none" });
  return { answer, sources };
}

function selectRelevantArticles(articles: ArchivedArticle[], question: string): ArchivedArticle[] {
  const searchTerms = normalizeSearchValue(question)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((term) => term.length >= 3 && !STOP_WORDS.has(term));

  const scoredArticles = articles.map((article) => {
    const normalizedTitle = normalizeSearchValue(article.title);
    const normalizedCategories = normalizeSearchValue(article.categories.join(" "));
    const normalizedContent = normalizeSearchValue(
      [article.excerpt, article.contentMarkdown].filter(Boolean).join(" "),
    );
    const score = searchTerms.reduce((total, term) => {
      const titleScore = normalizedTitle.includes(term) ? 8 : 0;
      const categoryScore = normalizedCategories.includes(term) ? 4 : 0;
      const contentScore = normalizedContent.includes(term) ? 1 : 0;
      return total + titleScore + categoryScore + contentScore;
    }, 0);
    return { article, score };
  });

  const highestScore = Math.max(...scoredArticles.map(({ score }) => score));
  const minimumRelevantScore = Math.max(1, Math.floor(highestScore / 2));
  const matchingArticles = scoredArticles.filter(({ score }) => score >= minimumRelevantScore);
  const candidates = matchingArticles.length > 0 ? matchingArticles : scoredArticles;
  return candidates
    .sort(
      (first, second) =>
        second.score - first.score || second.article.publishedAt.getTime() - first.article.publishedAt.getTime(),
    )
    .slice(0, MAX_SOURCES)
    .map(({ article }) => article);
}

function buildPrompt(question: string, sources: ArchivedArticle[], translations: Translations): string {
  const articleContext = sources
    .map((article, index) => {
      const content = article.contentMarkdown ?? article.excerpt ?? translations.noStoredArticleText;
      return [
        `[${index + 1}] ${article.title}`,
        `${translations.published}: ${article.publishedAt.toLocaleDateString(translations.locale)}`,
        `URL: ${article.url}`,
        content.slice(0, MAX_ARTICLE_CHARACTERS),
      ].join("\n");
    })
    .join("\n\n---\n\n");

  return translations.askPrompt(question, articleContext);
}

function formatSources(sources: ArchivedArticle[]): string {
  return sources.map((article, index) => `${index + 1}. [${escapeMarkdown(article.title)}](${article.url})`).join("\n");
}

function normalizeSearchValue(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("de-DE");
}

function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_{}[\]()#+\-.!|>])/g, "\\$1");
}
