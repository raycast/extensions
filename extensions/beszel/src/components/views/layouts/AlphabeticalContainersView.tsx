import type { ContainerStat } from "../../../types/container-stat";
import type { System } from "../../../types/system";
import { guessContainerInfo } from "../../../utils/containers";
import { ContainerListItem } from "../../ContainerListItem";

export interface AlphabeticalContainersViewProps {
  containerIds: string[];
  containers: ContainerStat[];
  system: System;
}

export function AlphabeticalContainersView({ containerIds, system }: AlphabeticalContainersViewProps) {
  return (
    <>
      {containerIds.sort().map((id) => {
        const info = guessContainerInfo(id);
        return <ContainerListItem key={id} id={id} info={info} system={system} />;
      })}
    </>
  );
}
