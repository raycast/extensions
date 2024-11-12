import { Action, ActionPanel, Icon, List, getPreferenceValues } from "@raycast/api";
import { getFavicon, useFetch } from "@raycast/utils";

interface Watch {
  last_changed: number;
  last_checked: number;
  last_error: boolean;
  title: string | null;
  url: string;
}
interface WatchesResponse {
  [key: string]: Watch;
}
export default function ListWatches() {
  const { instance_url, api_key } = getPreferenceValues<Preferences>();
  const url = new URL(instance_url).toString();
  const { isLoading, data } = useFetch<WatchesResponse>(url + "api/v1/watch", {
    headers: {
      "x-api-key": api_key
    }
  })

  return (
    <List isLoading={isLoading}>
      {data && Object.entries(data).map(([id, watch]) => {
        const keywords: string[] = [];
        if (watch.title) keywords.push(watch.title);

        const icon = getFavicon(watch.url, { fallback: Icon.Globe });

        return <List.Item key={id} icon={icon} title={watch.url} subtitle={watch.title ?? undefined} keywords={keywords} accessories={[
          { date: new Date(watch.last_checked * 1000), tooltip: "Last Checked", icon: Icon.MagnifyingGlass },
          watch.last_changed ? { date: new Date(watch.last_changed * 1000), tooltip: "Last Changed", icon: Icon.Pencil } : { text: "Not yet", tooltip: "Last Changed", icon: Icon.Pencil }
        ]} actions={<ActionPanel>
          <Action.OpenInBrowser icon={Icon.ArrowNe} title="Edit" url={`${url}edit/${id}#general`} />
          <Action.OpenInBrowser icon={Icon.ArrowNe} title="Preview" url={`${url}preview/${id}#text`} />
          <Action.OpenInBrowser icon={icon} url={watch.url} />
        </ActionPanel>} />
      })}
    </List>
  );
}
