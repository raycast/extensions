import { Action, ActionPanel, Icon, List, environment } from "@raycast/api";
import { Provider } from "../lib/provider";
import { ProviderVersion } from "../lib/provider-version";
import { useCachedState } from "@raycast/utils";
import { useEffect, useState } from "react";
import { Resource, getResourceList } from "../lib/resource";
import { hashColorizer } from "../lib/util";
import ResourceDetailView from "./resource-detail.view";
import { toResourceRawDocUrl, toResourceDocUrl } from "../lib/resource-detail";
import { useResourceHistoriesState, updateHistories } from "../lib/history";

export default function ResourceView(props: {
  provider: Provider;
  version: ProviderVersion;
}) {
  const [resources, setResources] = useCachedState<Resource[] | undefined>(
    `resources of ${props.provider.id}/${props.version.id}`,
    undefined,
    {
      cacheNamespace: `${environment.extensionName}`,
    },
  );
  const [resHistories, setResHistories] = useResourceHistoriesState();
  useEffect(() => {
    async function updateResouceList() {
      try {
        const res = resources
          ? resources
          : await getResourceList(props.provider, props.version);
        setResources(res);
        setFilteredResources(res);
        setResourceTypeListState([
          ...new Set(res?.map((r) => r.attributes.category)),
        ]);
      } catch (err) {
        throw new Error(`${err}`);
      }
    }
    updateResouceList();
  }, []);
  const [resourceTypeList, setResourceTypeListState] = useState<string[]>();
  const [filteredResources, setFilteredResources] = useState<
    Resource[] | undefined
  >();
  const filterByCategory = (filter: string) => {
    filter === "all"
      ? setFilteredResources(resources)
      : setFilteredResources(
          resources?.filter((r) => r.attributes.category === filter),
        );
  };
  return (
    <List
      isLoading={!(resources && resources.length > 0)}
      searchBarAccessory={
        <List.Dropdown
          tooltip="filter"
          onChange={(v) => {
            filterByCategory(v);
          }}
        >
          <List.Dropdown.Item
            title="all"
            key="all"
            value="all"
          ></List.Dropdown.Item>
          {resourceTypeList?.map((c) => (
            <List.Dropdown.Item title={c} key={c} value={c} />
          ))}
        </List.Dropdown>
      }
    >
      {filteredResources?.map((r) => (
        <List.Item
          title={r.attributes.title}
          key={r.id}
          keywords={[
            r.attributes.subcategory ?? "",
            r.attributes.category,
            r.attributes.title,
          ]}
          accessories={[
            {
              tag: {
                color: hashColorizer(r.attributes.subcategory ?? ""),
                value: r.attributes.subcategory ?? "default",
              },
              tooltip: "Category",
            },
            {
              tag: {
                color: hashColorizer(r.attributes.category ?? ""),
                value: r.attributes.category ?? "default",
              },
              tooltip: "Resource Type",
            },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Book}
                title={`Navigate to ${r.attributes.title}`}
                target={
                  <ResourceDetailView
                    provider={props.provider}
                    version={props.version}
                    resource={r}
                  />
                }
                onPush={() => {
                  updateHistories(
                    {
                      provider: props.provider,
                      version: props.version,
                      resource: r,
                    },
                    resHistories,
                    setResHistories,
                  );
                }}
              ></Action.Push>
              <Action.OpenInBrowser
                title={`Open in Browser`}
                url={toResourceDocUrl(props.provider, props.version, r)}
                shortcut={{ modifiers: ["shift"], key: "enter" }}
              />
              <Action.OpenInBrowser
                title={`Open Raw Doc in Browser`}
                url={toResourceRawDocUrl(props.provider, props.version, r)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
              />
            </ActionPanel>
          }
        ></List.Item>
      ))}
    </List>
  );
}
