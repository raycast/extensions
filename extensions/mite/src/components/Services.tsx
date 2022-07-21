import { Action, ActionPanel, Icon, List } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { Service } from "../model/Service";
import { getServices } from "../utils/api";
import Notes from "./Notes";

interface IProps {
  projectId: number;
  projectName: string;
}

interface State {
  loading: boolean;
  services: Service[];
}

export default function Services({ projectId, projectName }: IProps) {
  const [state, setState] = useState<State>({ loading: true, services: [] });

  useEffect(() => {
    (async () => {
      try {
        const { data: services } = await getServices();
        setState({ loading: false, services });
      } catch (error) {
        setState((previous) => ({ ...previous, loading: false }));
      }
    })();
  }, []);

  function getListItem(service: Service) {
    return (
      <List.Item
        key={service.id}
        title={service.name ? service.name : "Unknown"}
        accessories={service.billable ? [{ icon: Icon.Checkmark, text: "Billable" }] : []}
        actions={
          <ActionPanel>
            <Action.Push
              title="Next"
              target={
                <Notes
                  projectId={projectId}
                  projectName={projectName}
                  serviceId={service.id}
                  serviceName={service.name}
                />
              }
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={state.loading}
      navigationTitle={projectName + " > Select Service"}
      searchBarPlaceholder="Browse Services"
    >
      <List.Item
        key="0"
        title="-"
        actions={
          <ActionPanel>
            <Action.Push
              title="Next"
              target={<Notes projectId={projectId} projectName={projectName} serviceId={0} serviceName={""} />}
            />
          </ActionPanel>
        }
      />
      {/*<List.Section title="Popular">*/}
      {/*  {state.services*/}
      {/*    .filter((service) =>*/}
      {/*      ["X", "Y"] // TODO: get popular services dynamically*/}
      {/*        .some((str) => service.name.includes(str))*/}
      {/*    )*/}
      {/*    .map((service) => getListItem(service))}*/}
      {/*</List.Section>*/}
      {/*<List.Section title="All">*/}
      {state.services.map((service) => getListItem(service))}
      {/*</List.Section>*/}
    </List>
  );
}
