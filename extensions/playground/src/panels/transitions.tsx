import { Action, ActionPanel, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Schema } from "../utils/types";
import { titleCase } from "../utils/helpers";
import { ActionForm } from "./action-form";

export const Transitions = (props: { apiUrl: string }) => {
  const { apiUrl } = props;
  const { data = {}, isLoading } = useFetch<Record<string, string>>(`${apiUrl}/reducerSchemaMapping`);
  const { data: schemas, isLoading: isSchemaLoading } = useFetch<Schema[]>(`${apiUrl}/schemas`);

  return (
    <List isLoading={isLoading || isSchemaLoading}>
      {Object.keys(data).map((transition) => (
        <List.Item
          key={transition}
          title={titleCase(transition)}
          subtitle={`Schema: ${data[transition]}`}
          actions={
            <ActionPanel>
              <Action.Push
                title="Perform"
                target={
                  <ActionForm
                    apiUrl={apiUrl}
                    transitionName={transition}
                    schema={schemas?.find((s) => s.identifier === data[transition])}
                  />
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};
