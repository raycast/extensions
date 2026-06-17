import { ActionPanel, List, Action } from "@raycast/api";
import { readFile } from "fs/promises";
import { useCachedPromise } from "@raycast/utils";
import { AZURE_PORTAL_URL_BASE } from "./constants";
import { AzurePortal, AzureService } from "./interfaces";

async function loadAzurePortalDescription(): Promise<AzurePortal> {
  const file = await readFile(`${__dirname}/assets/azure-services.json`, "utf8");
  return JSON.parse(file);
}

export default function Console() {
  const { data, isLoading } = useCachedPromise(loadAzurePortalDescription);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter services by name...">
      {data &&
        Object.keys(data).map((category) => (
          <List.Section key={category} title={category}>
            {data[category].map((service: AzureService, idx: number) => (
              <List.Item
                key={`${service.name}${idx}`}
                title={service.name}
                icon={service.icon}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      url={`${
                        service.href.startsWith("https") ? service.href : `${AZURE_PORTAL_URL_BASE}/${service.href}`
                      }`}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))}
    </List>
  );
}
