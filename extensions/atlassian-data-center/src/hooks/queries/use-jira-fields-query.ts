import { useQuery } from "@tanstack/react-query";
import { Icon } from "@raycast/api";

import { getJiraFields } from "@/utils";
import type { JiraField, ProcessedJiraField, HookQueryOptions, ListItemAccessories } from "@/types";

export function useJiraFieldsQuery(
  queryOptions?: HookQueryOptions<JiraField[], ProcessedJiraField[], readonly [{ scope: "jira"; entity: "fields" }]>,
) {
  return useQuery({
    queryKey: [{ scope: "jira", entity: "fields" }],
    queryFn: getJiraFields,
    select: (data) => data.map((field) => processItem(field, false)),
    staleTime: Infinity,
    gcTime: Infinity,
    ...queryOptions,
  });
}

function processItem(field: JiraField, isAdded: boolean): ProcessedJiraField {
  const schemaType = field.schema?.type || "Unknown";
  const subtitle = {
    value: field.id,
    tooltip: `Field ID: ${field.id}`,
  };

  const accessories: ListItemAccessories = [
    ...(isAdded
      ? [
          {
            icon: Icon.Checkmark,
            tooltip: "Included in search",
          },
        ]
      : []),
    {
      text: schemaType,
      tooltip: `Field Schema Type: ${schemaType}`,
    },
    {
      text: field.custom ? "Custom" : "System",
      tooltip: `Field Type: ${field.custom ? "Custom" : "System"}`,
    },
  ];

  return {
    renderKey: field.id,
    title: field.name,
    id: field.id,
    name: field.name,
    subtitle,
    accessories,
    custom: field.custom,
    isAdded,
    keywords: [field.id, schemaType],
    schema: field.schema,
  };
}
