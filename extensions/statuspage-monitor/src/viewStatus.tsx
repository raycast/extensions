import { ActionPanel, Detail, List, Action, Icon, Color, Image } from "@raycast/api";

import { useState, useEffect } from "react";
import AddServiceList from "./addService";
import { getStatus, getFavicon } from "./lib/api";
import { getPageIds, removePageId, setPageIds } from "./lib/store";
import { PageStatus } from "./lib/types";
import { capitalizeFirstLetter, iconForIndicator } from "./lib/util";
import ServiceStatusList from "./service";

export default function ViewStatusList() {
  const [isLoading, setLoading] = useState(true);
  const [services, setServices] = useState<PageStatus[]>([]);
  const [missingServices, setMissingServices] = useState<string[]>([]);

  useEffect(() => {
    if (!services.length) fetchPageData();
  }, []);

  async function fetchPageData() {
    setLoading(true);

    const pageIds = await getPageIds();

    const missing: string[] = [];
    const fetchStatusPages = await Promise.all(
      pageIds.map(
        (id) =>
          new Promise<PageStatus | null>((res) => {
            getStatus(id)
              .then(res)
              .catch(() => {
                missing.push(id);
                res(null);
              });
          })
      )
    );

    const pages = fetchStatusPages.filter((p): p is PageStatus => !!p);

    setServices(pages);
    setMissingServices(missing);
    setLoading(false);
  }

  function AddServicePushActionPanel() {
    return (
      <ActionPanel>
        <Action.Push title="Add Service" icon={Icon.Plus} target={<AddServiceList refreshStatus={fetchPageData} />} />
      </ActionPanel>
    );
  }

  function ServiceActionPanel({ id }: { id: string }) {
    return (
      <ActionPanel>
        <Action.Push title="View Status" icon={Icon.ArrowRight} target={<ServiceStatusList id={id} />} />
        <Action
          title="Delete Service"
          icon={{ source: Icon.Trash, tintColor: Color.Red }}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={() => deleteService(id)}
        />
      </ActionPanel>
    );
  }

  async function deleteService(id: string) {
    await removePageId(id);
    await fetchPageData();
  }

  return (
    <List isLoading={isLoading}>
      {!isLoading && (
        <>
          <List.Item
            title="Add Service"
            subtitle="Add a new service to this list"
            icon={{ source: Icon.Plus }}
            actions={<AddServicePushActionPanel />}
          />
          <List.Section title="Services">
            {services.map((service, index) => (
              <List.Item
                key={index}
                title={service.page.name}
                subtitle={service.status.description}
                icon={`https://www.google.com/s2/favicons?domain=${service.page.url}&sz=64`}
                accessories={[
                  {
                    icon: iconForIndicator(service.status.indicator),
                    tooltip: capitalizeFirstLetter(service.status.indicator),
                  },
                ]}
                actions={<ServiceActionPanel id={service.page.id} />}
              />
            ))}
            {missingServices.map((id, index) => (
              <List.Item
                key={index}
                title={`Failed to fetch: ${id}`}
                subtitle="This service may have been deleted, or the request failed."
                icon={{ source: Icon.XmarkCircle, tintColor: Color.Red }}
                actions={<ServiceActionPanel id={id} />}
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
