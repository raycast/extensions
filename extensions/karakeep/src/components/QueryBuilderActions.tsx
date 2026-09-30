import { Action, ActionPanel, Icon } from "@raycast/api";
import { useCallback, useMemo } from "react";
import { useTranslation } from "../hooks/useTranslation";

interface QueryBuilderActionsProps {
  query: string;
  onInsert: (qualifier: string) => void;
}

/**
 * ActionPanel.Section that appends smart-list qualifiers to the query field.
 * Only rendered when the form is in "smart" list mode.
 */
export function QueryBuilderActions({ query, onInsert }: QueryBuilderActionsProps) {
  const { t } = useTranslation();

  const append = useCallback(
    (qualifier: string) => {
      const current = query.trim();
      onInsert(current ? `${current} ${qualifier}` : qualifier);
    },
    [query, onInsert],
  );

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  return (
    <ActionPanel.Section title={t("list.queryBuilder.sectionTitle")}>
      <Action title={t("list.queryBuilder.addTag")} icon={Icon.Hashtag} onAction={() => append("#")} />
      <ActionPanel.Submenu title={t("list.queryBuilder.addIsFilter")} icon={Icon.Filter}>
        <Action title={t("list.queryBuilder.isFav")} onAction={() => append("is:fav")} />
        <Action title={t("list.queryBuilder.isArchived")} onAction={() => append("is:archived")} />
        <Action title={t("list.queryBuilder.isRead")} onAction={() => append("is:read")} />
        <Action title={t("list.queryBuilder.isUnread")} onAction={() => append("is:unread")} />
      </ActionPanel.Submenu>
      <Action title={t("list.queryBuilder.addUrlFilter")} icon={Icon.Link} onAction={() => append("url:")} />
      <Action
        title={t("list.queryBuilder.addAfterDate")}
        icon={Icon.Calendar}
        onAction={() => append(`after:${today}`)}
      />
      <Action
        title={t("list.queryBuilder.addBeforeDate")}
        icon={Icon.Calendar}
        onAction={() => append(`before:${today}`)}
      />
      <ActionPanel.Submenu title={t("list.queryBuilder.addTypeFilter")} icon={Icon.Tag}>
        <Action title={t("list.queryBuilder.typeLink")} onAction={() => append("type:link")} />
        <Action title={t("list.queryBuilder.typeText")} onAction={() => append("type:text")} />
        <Action title={t("list.queryBuilder.typeImage")} onAction={() => append("type:image")} />
        <Action title={t("list.queryBuilder.typeVideo")} onAction={() => append("type:video")} />
        <Action title={t("list.queryBuilder.typePdf")} onAction={() => append("type:pdf")} />
      </ActionPanel.Submenu>
    </ActionPanel.Section>
  );
}
