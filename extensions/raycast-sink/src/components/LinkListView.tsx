import { List, Icon } from "@raycast/api";
import { useLinks } from "../hooks/useLinks";
import { useTranslation } from "../hooks/useTranslation";
import { useConfig } from "../hooks/useConfig";
import { Link, Config } from "../types";
import { LinkItem } from "./LinkItem";

export function LinkListView() {
  const { links, isLoading: isLinksLoading, refreshLinks, cleanCache } = useLinks();
  const { t } = useTranslation();
  const { config, isLoading: isConfigLoading, updateConfig } = useConfig();
  if (isLinksLoading || isConfigLoading || !config) {
    <List.EmptyView
      title={t.loadingLinks || "Loading"}
      description={t.loadingLinksDescription || "Your links are on the way"}
      icon={Icon.AirplaneLanding}
    />;
  }
  const validLinks = links.filter((link): link is Link => link != null && typeof link === "object" && "id" in link);
  const listTitle = `${t.linkListCount} (${links?.length || 0})`;
  if (validLinks.length === 0) {
    return (
      <List>
        <List.EmptyView
          title={t.noLinks || "No Links"}
          description={t.createLinkDescription || "Create a new short link"}
          icon={Icon.Link}
        />
      </List>
    );
  }

  return (
    <List isLoading={isLinksLoading}>
      <List.Section title={listTitle}>
        {validLinks.map((link) => (
          <LinkItem
            key={link.id}
            link={link}
            config={config as Config}
            onRefresh={refreshLinks}
            onCleanCache={cleanCache}
            updateConfig={updateConfig}
          />
        ))}
      </List.Section>
    </List>
  );
}
