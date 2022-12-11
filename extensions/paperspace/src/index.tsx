import { Icon, List } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import { useEffect, useState } from "react";
import { setInterval } from "timers";
import { iconForMachineState, Machine } from "./machine";
import { MachineActionPanel } from "./machine-action-panel";
import { usePaperspace } from "./use-paperspace";

export default () => {
  const [searchText, setSearchText] = useState("");

  const machines = usePaperspace<Machine[]>(
    "GET",
    `/machines/getMachines${searchText ? "?name=" + searchText : ""}`
  );

  useEffect(() => {
    const interval = setInterval(() => machines.revalidate(), 3000);
    return () => clearInterval(interval);
  });

  return (
    <List
      isLoading={machines.isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      {machines.data &&
        machines.data.map((machine) => (
          <List.Item
            key={machine.id}
            id={machine.id}
            icon={getAvatarIcon(machine.name)}
            title={machine.name}
            subtitle={machine.id}
            accessories={[
              {
                icon: Icon.Globe,
                text: machine.region,
                tooltip: "Operating System",
              },
              {
                icon: Icon.ComputerChip,
                text: machine.machineType,
                tooltip: "Machine Type",
              },
              {
                icon: iconForMachineState[machine.state],
                text: machine.state,
                tooltip: "State",
              },
            ]}
            actions={<MachineActionPanel machine={machine} />}
          />
        ))}
    </List>
  );
};
