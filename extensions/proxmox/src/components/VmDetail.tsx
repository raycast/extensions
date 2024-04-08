import { List } from "@raycast/api";
import { PveVmStatus, type PveVm } from "../api";
import { formatPercentage, formatShortTime, formatStorageSize } from "../utils";

function formatCPU(maxcpu: number): string {
  return Math.round(maxcpu) + " CPU(s)";
}

export default function VmDetail({ vm }: { vm: PveVm }) {
  const isRunning = vm.status === PveVmStatus.running;
  let cpu, memory, disk;
  if (isRunning) {
    cpu = [formatPercentage(vm.cpu), formatCPU(vm.maxcpu)].join(" / ");
    memory = [formatStorageSize(vm.mem), formatStorageSize(vm.maxmem)].join(" / ");
    disk = [formatStorageSize(vm.disk), formatStorageSize(vm.maxdisk)].join(" / ");
  } else {
    cpu = formatCPU(vm.maxcpu);
    memory = formatStorageSize(vm.maxmem);
    disk = formatStorageSize(vm.maxdisk);
  }

  let uptime, diskUsage, netUsage;
  if (isRunning) {
    uptime = formatShortTime(vm.uptime);
    diskUsage = [formatStorageSize(vm.diskread), formatStorageSize(vm.diskwrite)].join(" / ");
    netUsage = [formatStorageSize(vm.netin), formatStorageSize(vm.netout)].join(" / ");
  }

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="ID" text={vm.vmid.toString()} />
          <List.Item.Detail.Metadata.Label title="Node" text={vm.node} />
          <List.Item.Detail.Metadata.Label title="Status" text={vm.status} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="CPU" text={cpu} />
          <List.Item.Detail.Metadata.Label title="Memory" text={memory} />
          <List.Item.Detail.Metadata.Label title="Disk" text={disk} />
          {isRunning && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Uptime" text={uptime} />
              <List.Item.Detail.Metadata.Label title="Disk usage" text={diskUsage} />
              <List.Item.Detail.Metadata.Label title="Net usage" text={netUsage} />
            </>
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
