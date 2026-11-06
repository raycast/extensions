import { Icon, List } from "@raycast/api";
import { Machine } from "../types";
import { formatDateTime, formatRelative, formatSpec } from "../utils/format";
import { stateIcon, stateInfo } from "../utils/machine-state";
import { MachineActions } from "./machine-actions";

interface MachineListItemProps {
  machine: Machine;
  onChange: () => void;
}

export function MachineListItem({ machine, onChange }: MachineListItemProps) {
  const { label, color } = stateInfo(machine);
  const accessories: List.Item.Accessory[] = [];

  // `archiveAt` only stops a running machine; the API clears it for one that is not running when it passes.
  if (machine.archiveAt && machine.state === "running") {
    const upcoming = new Date(machine.archiveAt).getTime() > Date.now();
    accessories.push({
      icon: Icon.Clock,
      text: upcoming ? `Stops ${formatRelative(machine.archiveAt)}` : "Stops soon",
      tooltip: `Stops ${formatDateTime(machine.archiveAt)}`,
    });
  }
  accessories.push({ icon: Icon.Box, text: machine.template.id, tooltip: `Template ${machine.template.id}` });
  accessories.push({ tag: { value: label, color }, tooltip: machine.lastError?.message });

  return (
    <List.Item
      id={machine.id}
      icon={stateIcon(machine)}
      title={machine.name}
      subtitle={formatSpec(machine.spec)}
      keywords={[machine.id, machine.template.id, label, ...Object.values(machine.metadata ?? {})]}
      accessories={accessories}
      actions={<MachineActions machine={machine} onChange={onChange} />}
    />
  );
}
