import { ActionPanel, Detail, List, Action, Icon, Color } from "@raycast/api";

import { useState, useEffect } from "react";
import { getStatus, getFavicon } from "./lib/api";
import { getPageIds } from "./lib/store";
import { Page, Status } from "./lib/types";

//const pageIds = ["srhpyqt94yxb", "kctbh9vrtdwd", "yh6f0r4529hb", "broken"];

export default function ViewStatusList() {
  const [isLoading, setLoading] = useState(true);
  const [services, setServices] = useState<Status[]>([]);
  const [missingServices, setMissingServices] = useState<string[]>([]);
  const [icons, setIcons] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!services.length) fetchPageData();
  }, []);

  async function fetchPageData() {
    setLoading(true);

    const pageIds = getPageIds();

    const missing: string[] = [];
    const fetchStatusPages = await Promise.all(
      pageIds.map(
        (id) =>
          new Promise<Status | null>((res) => {
            getStatus(id)
              .then(res)
              .catch(() => {
                missing.push(id);
                res(null);
              });
          })
      )
    );

    const pages = fetchStatusPages.filter((p): p is Status => !!p);

    fetchIcons(pages);

    setServices(pages);
    setMissingServices(missing);
    setLoading(false);
  }

  async function fetchIcons(services: Status[]) {
    const icons: Record<string, string> = {};
    await Promise.all(
      services.map(
        (service) =>
          new Promise<void>((res) => {
            getFavicon(service.page.id).then((iconUri) => {
              if (iconUri) icons[service.page.id] = `https:${iconUri}`;
              res();
            });
          })
      )
    );

    setIcons(icons);
  }

  return (
    <List isLoading={isLoading}>
      {services.map((service, index) => {
        return (
          <List.Item
            key={index}
            title={service.page.name}
            subtitle={service.status.description}
            icon={`https://www.google.com/s2/favicons?domain=${service.page.url}&sz=64`}
          />
        );
      })}
      {missingServices.map((id, index) => (
        <List.Item
          key={index}
          title={`Failed to fetch: ${id}`}
          subtitle="This service may have been deleted, or the request failed."
          icon={{ source: Icon.XmarkCircle, tintColor: Color.Red }}
        />
      ))}
      <List.Item
        title="Add Service"
        subtitle="Press enter to add a service to this list."
        icon={{ source: Icon.Plus }}
      />
    </List>
  );
}
