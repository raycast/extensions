import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";

type PathDefinition = Record<string, { operationId: string; tags: string[]; summary: string; deprecated: boolean }>;

export default function Command() {
  const { isLoading, data } = useFetch<{ components: unknown; paths: Record<string, PathDefinition> }>(
    "https://api.mittwald.de/v2/openapi.json",
    {
      method: "get",
      headers: {
        "Content-Type": "application/json",
      },
      keepPreviousData: true,
    },
  );

  const endpoints = Object.entries(data?.paths ?? {}).flatMap(([path, operations]) => {
    const operationsEntries = Object.entries(operations);
    const endpoints = operationsEntries.flatMap(([operation, operationDefinition]) => {
      if (operationDefinition.deprecated) {
        return [];
      }

      // endpoints without tags are also not rendered by the official API documentation https://developer.mittwald.de/docs/v2/reference/
      if (operationDefinition.tags.length === 0) {
        return [];
      }
      return {
        method: operation,
        operationId: operationDefinition.operationId,
        summary: operationDefinition.summary,
        path,
        topic: operationDefinition.tags[0].toLowerCase(),
      };
    });

    return endpoints;
  });

  return (
    <List isLoading={!endpoints && isLoading}>
      {endpoints.map((endpoint) => (
        <List.Item
          key={`${endpoint.method}-${endpoint.path}`}
          icon={Icon.Dot}
          title={`${endpoint.method.toUpperCase()} ${endpoint.path}`}
          subtitle={endpoint.summary}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                url={`https://developer.mittwald.de/docs/v2/reference/${endpoint.topic}/${endpoint.operationId}/`}
              ></Action.OpenInBrowser>
              <Action.CopyToClipboard
                content={`https://developer.mittwald.de/docs/v2/reference/${endpoint.topic}/${endpoint.operationId}/`}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
