import { List } from "@raycast/api";

import type { ContainerStat } from "../../../types/container-stat";
import type { System } from "../../../types/system";
import { guessContainerInfo, type ContainerInfoGuess } from "../../../utils/containers";
import { ContainerListItem } from "../../ContainerListItem";

export interface ClusteredContainersViewProps {
  containerIds: string[];
  containers: ContainerStat[];
  system: System;
}

export function ClusteredContainersView({ containerIds, system }: ClusteredContainersViewProps) {
  const clusteredContainers = containerIds
    .map((id) => ({ id, info: guessContainerInfo(id) }))
    .reduce(
      (prev, item) => ({
        ...prev,
        [item.info.cluster]: [...(prev[item.info.cluster] || []), item],
      }),
      {} as Record<string, Array<{ id: string; info: ContainerInfoGuess }>>,
    );

  return (
    <>
      {Object.keys(clusteredContainers)
        .sort()
        .map((cluster) => (
          <List.Section key={cluster} title={cluster} subtitle={`${clusteredContainers[cluster].length}`}>
            {clusteredContainers[cluster].map(({ id, info }) => (
              <ContainerListItem key={id} id={id} info={info} system={system} />
            ))}
          </List.Section>
        ))}
    </>
  );
}
