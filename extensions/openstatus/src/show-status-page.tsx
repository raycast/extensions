import { Action, ActionPanel, getPreferenceValues, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { pageSchema } from "./api/schema";

export default function ShowPages() {
  const preferences = getPreferenceValues<Preferences>();

  const { isLoading, data } = useFetch("https://api.openstatus.dev/v1/page", {
    headers: {
      "x-openstatus-key": `${preferences.access_token}`,
    },
    mapResult(result) {
      return { data: pageSchema.array().parse(result) };
    },
    keepPreviousData: true,
    initialData: [],
  });

  return (
    <List isLoading={isLoading}>
      {data.map((page) => (
        <List.Item
          key={page.id}
          title={page.title}
          subtitle={page.description}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="View Page"
                url={page.customDomain ? `https://${page.customDomain}` : `https://${page.slug}.openstatus.dev`}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
