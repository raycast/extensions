import { List } from "@raycast/api";
import { useLinks } from "../hooks/useLinks";
import { useTranslation } from "../hooks/useTranslation";
import { useConfig } from "../hooks/useConfig";
import { Link } from "../types";
import { LinkItem } from "./LinkItem";

export function LinkListView() {
  const { links, isLoading: isLinksLoading, refreshLinks, cleanCache } = useLinks();
  const { t } = useTranslation();
  const { config, isLoading: isConfigLoading, updateConfig } = useConfig();

  if (isLinksLoading || isConfigLoading || !config) {
    return <List isLoading={true} />;
  }
  const validLinks = links.filter((link): link is Link => link != null && typeof link === "object" && "id" in link);

  if (validLinks.length === 0) {
    return (
      <List>
        <List.EmptyView
          title={t.noLinks || "No Links"}
          description={t.createLinkDescription || "Create a new short link"}
          icon="🔗"
        />
      </List>
    );
  }

  return (
    <List isLoading={isLinksLoading}>
      {validLinks.map((link) => (
        <LinkItem
          key={link.id}
          link={link}
          config={config}
          onRefresh={refreshLinks}
          onCleanCache={cleanCache}
          updateConfig={updateConfig}
        />
      ))}
    </List>
  );
}
