import { Action, ActionPanel, Cache, launchCommand, LaunchType, List } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { preferences } from "../preferences";
import { Program, ServiceId } from "../types";
import { getFormattedDate } from "../utils";
import { ProgramDetail } from "./ProgramDetail";
import { SearchBarDropdown } from "./ServiceSelectSearchBar";

const cache = new Cache();

type Props = {
  customFilters?: ((program: Program) => boolean)[];
  canSelectAll?: boolean;
  targetServiceIds?: ServiceId[];
};

export function ProgramList({ customFilters = [], canSelectAll = false }: Props): React.JSX.Element {
  const [serviceId, setServiceId] = useState<ServiceId>(canSelectAll ? "all" : "g1");
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    setIsLoading(true);
    const cachedPrograms = getProgramsFromCache(serviceId);
    setPrograms(cachedPrograms);
    setIsLoading(false);
  }, [serviceId]);

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={<SearchBarDropdown onChange={setServiceId} canSelectAll={canSelectAll} />}
    >
      {programs.length === 0 ? (
        <List.EmptyView
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
          .map((p) => {
            return (
              <List.Item
                key={`${p.service.id}:${p.id}`} // When "all" is selected, ids might duplicate, so use "service" as a prefix.
                icon={{ source: `https:${p.service.logo_s.url}` }}
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
            );
          })
      )}
    </List>
  );
}

function getProgramsFromCache(serviceId: ServiceId): Program[] {
  if (serviceId === "all") {
    const allPrograms = preferences.services.flatMap((sid) => JSON.parse(cache.get(sid) ?? "[]")) as Program[];
    return allPrograms.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }

  return JSON.parse(cache.get(serviceId) ?? "[]") as Program[];
}
