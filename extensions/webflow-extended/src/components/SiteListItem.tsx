import { Action, ActionPanel, Icon, List, Toast, confirmAlert, open, showToast } from "@raycast/api";
import { Webflow } from "webflow-api";
import { getCMSCollections, getPages, publishSite } from "../webflow/client";
import { useEffect, useState } from "react";
import PageListItem from "./PageListItem";
import CollectionListItem from "./CollectionListItem";
import { logout } from "../webflow/oauth";

export default function SiteListItem(props: { site: Webflow.Site }) {
  const { site } = props;

  const name = site.displayName ?? "Untitled Site";
  const customDomain = site.customDomains?.[0]?.url ?? "Staging only";
  const imageUrl = site.previewUrl ?? Icon.BlankDocument;

  return (
    <List.Item
      title={name}
      subtitle={customDomain}
      icon={{ source: imageUrl }}
      actions={
        <ActionPanel title={name}>
          <Action.Push
            title="Open Site Pages"
            icon={Icon.Document}
            target={<ShowSitePages siteId={site.id} siteSlug={site.shortName ?? ""} />}
          />
          <Action
            title="Open in Webflow"
            icon={Icon.Link}
            onAction={() => {
              const url = `https://${site.shortName}.design.webflow.com`;
              open(url);
            }}
          />
          <Action.Push
            title="Open CMS Colletions"
            icon={Icon.List}
            shortcut={{ modifiers: ["shift"], key: "enter" }}
            target={<ShowCollections siteId={site.id} staging={site.shortName ?? ""} />}
          />
          <Action
            title="Publish Site"
            icon={Icon.Upload}
            onAction={async () => {
              if (
                await confirmAlert({
                  title: "Publish Site",
                  message: "Are you sure you want to publish this site?",
                  icon: Icon.Warning,
                  primaryAction: { title: "Publish" },
                })
              ) {
                publishSite(site.id);
                showToast(Toast.Style.Success, "Site published successfully");
              }
            }}
          />
          <Action
            title="Logout"
            icon={Icon.Logout}
            onAction={() => {
              logout();
            }}
          />
        </ActionPanel>
      }
    />
  );
}

function ShowSitePages(props: { siteId: string; siteSlug: string }) {
  const [searchText, setSearchText] = useState<string>();
  const [filteredPages, setFilteredPages] = useState<Webflow.PageList>();
  const [pages, setPages] = useState<Webflow.PageList>();
  const response = getPages(props.siteId);

  if (response.error) {
    showToast(Toast.Style.Failure, "Failed to load sites", response.error);
  }

  useEffect(() => {
    if (response.result) {
      setPages(response.result);
      setFilteredPages(response.result);
    }
  }, [response.result]);

  useEffect(() => {
    if (pages) {
      const filtered = pages.pages?.filter((page) => {
        return page.title?.toLowerCase().includes(searchText?.toLowerCase() ?? "");
      });
      setFilteredPages({ pages: filtered });
    }
  }, [searchText]);

  return (
    <List
      searchBarPlaceholder="Search pages..."
      onSearchTextChange={setSearchText}
      isLoading={response.isLoading}
      throttle
    >
      {filteredPages?.pages?.map((page) => <PageListItem key={page.id} page={page} siteSlug={props.siteSlug} />)}
    </List>
  );
}

function ShowCollections(props: { staging: string; siteId: string }) {
  const [searchText, setSearchText] = useState<string>();
  const [filteredCollections, setFilteredCollections] = useState<Webflow.CollectionList>();
  const [collections, setColletions] = useState<Webflow.CollectionList>();
  const response = getCMSCollections(props.siteId);

  if (response.error) {
    showToast(Toast.Style.Failure, "Failed to load site collections", response.error);
  }

  useEffect(() => {
    if (response.result) {
      setColletions(response.result);
      setFilteredCollections(response.result);
    }
  }, [response.result]);

  useEffect(() => {
    if (collections) {
      const filtered = collections?.collections?.filter((collection) => {
        return collection.displayName?.toLowerCase().includes(searchText?.toLowerCase() ?? "");
      });
      setFilteredCollections({ collections: filtered });
    }
  }, [searchText]);

  return (
    <List
      searchBarPlaceholder="Search collections..."
      onSearchTextChange={setSearchText}
      isLoading={response.isLoading}
      throttle
    >
      {filteredCollections?.collections?.map((collection) => (
        <CollectionListItem key={collection.id} staging={props.staging} collection={collection} />
      ))}
    </List>
  );
}
