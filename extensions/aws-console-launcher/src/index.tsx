import {
  Action,
  ActionPanel,
  Icon,
  List,
  getPreferenceValues,
  open,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { services } from "./services";
import { getUsageMap, recordUsage } from "./storage";
import { partitionByUsage } from "./utils/ranking";
import { buildConsoleUrl } from "./utils/url";
import { AwsService } from "./types";

interface Preferences {
  defaultRegion: string;
}

export default function Command() {
  const { defaultRegion } = getPreferenceValues<Preferences>();
  const { data: usageMap, isLoading, revalidate } = usePromise(getUsageMap);

  const { recent, all } = partitionByUsage(services, usageMap ?? {});

  async function handleOpen(service: AwsService) {
    const url = buildConsoleUrl(service, defaultRegion);
    await open(url);
    await recordUsage(service.id);
    revalidate();
  }

  function renderItem(service: AwsService) {
    const url = buildConsoleUrl(service, defaultRegion);
    return (
      <List.Item
        key={service.id}
        id={service.id}
        title={service.name}
        subtitle={service.category}
        icon={service.icon}
        keywords={[service.id, ...service.aliases, ...service.keywords]}
        accessories={[{ text: service.isGlobal ? "Global" : defaultRegion }]}
        actions={
          <ActionPanel>
            <Action
              title="Open Console"
              icon={Icon.Globe}
              onAction={() => handleOpen(service)}
            />
            <Action.CopyToClipboard title="Copy Console URL" content={url} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search AWS services...">
      {recent.length > 0 && (
        <List.Section title="Recent" subtitle={`${recent.length} services`}>
          {recent.map(renderItem)}
        </List.Section>
      )}
      <List.Section title="All Services" subtitle={`${all.length} services`}>
        {all.map(renderItem)}
      </List.Section>
    </List>
  );
}
