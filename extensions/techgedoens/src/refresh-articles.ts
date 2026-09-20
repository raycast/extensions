import { environment, getPreferenceValues, LaunchType, showHUD, updateCommandMetadata } from "@raycast/api";
import { normalizeArticleRetention, readArticleArchive, refreshArticleArchive } from "./article-archive";
import { ARTICLE_COUNT } from "./articles";
import { refreshArticleCache } from "./article-cache";
import { getTranslations } from "./i18n";

type ArchivePreferences = {
  archiveRetention?: string;
  language?: string;
};

export default async function RefreshArticlesCommand() {
  const preferences = getPreferenceValues<ArchivePreferences>();
  const translations = getTranslations(preferences.language);
  const retention = normalizeArticleRetention(preferences.archiveRetention);
  try {
    const previousArticleIds = new Set((await readArticleArchive()).map((article) => article.id));
    const [latestArticles, archivedArticles] = await Promise.all([
      refreshArticleCache(ARTICLE_COUNT),
      refreshArticleArchive(retention),
    ]);
    const updateTime = new Intl.DateTimeFormat(translations.locale, {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date());

    await updateCommandMetadata({ subtitle: translations.updatedAt(updateTime) });

    if (environment.launchType === LaunchType.UserInitiated) {
      const newArticleCount = archivedArticles.filter((article) => !previousArticleIds.has(article.id)).length;
      const updateMessage =
        newArticleCount === 0 ? translations.noNewArticles : translations.newArticles(newArticleCount);
      await showHUD(`${updateMessage} · ${translations.checkedArticles(latestArticles.length)}`);
    }
  } catch (error) {
    await updateCommandMetadata({ subtitle: translations.updateFailed });

    if (environment.launchType === LaunchType.UserInitiated) {
      await showHUD(translations.updateFailed);
    }

    throw error;
  }
}
