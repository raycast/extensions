import { Action, ActionPanel, Cache, Icon, launchCommand, LaunchType, List } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { Program, ServiceId } from "../types";
import { getFormattedDate } from "../utils";
import { ProgramDetail } from "./ProgramDetail";
import { SearchBarDropdown } from "./ServiceSelectSearchBar";

const cache = new Cache();

type Props = {
  customFilters?: ((program: Program) => boolean)[];
};

export function ProgramList({ customFilters = [] }: Props): React.JSX.Element {
  const [serviceId, setServiceId] = useState<ServiceId>("g1");
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    setIsLoading(true);
    const cachedPrograms = (JSON.parse(cache.get(serviceId) ?? "[]") as Program[]) ?? [];
    setPrograms(cachedPrograms);
    setIsLoading(false);
  }, [serviceId]);

  return (
    <List isLoading={isLoading} searchBarAccessory={<SearchBarDropdown onChange={setServiceId} />}>
      {programs.length === 0 ? (
        <List.EmptyView
          icon={{ source: Icon.XMarkTopRightSquare, tintColor: "#efda6f" }}
          title="There was no cached program data."
          description="Please run the Update Local Cache command."
          actions={
            <ActionPanel>
              <Action
                title="Update Local Cache"
                onAction={() => launchCommand({ name: "update-local-cache", type: LaunchType.UserInitiated })}
              />
            </ActionPanel>
          }
        />
      ) : (
        programs
          .filter((p) => new Date(p.end_time) > new Date())
          .filter((p) => customFilters.every((f) => f(p)))
          .map((p) => (
            <List.Item
              key={p.id}
              icon={{
                source: Icon.Document,
              }}
              title={p.title}
              accessories={[
                {
                  text: `${getFormattedDate(new Date(p.start_time), "MM-DD")} ${getFormattedDate(new Date(p.start_time), "HH:mm")}~${getFormattedDate(new Date(p.end_time), "HH:mm")}`,
                },
              ]}
              actions={
                <ActionPanel title={p.title}>
                  <Action.Push title="Show Detail" target={<ProgramDetail program={p} />} />
                </ActionPanel>
              }
            />
          ))
      )}
    </List>
  );
}
