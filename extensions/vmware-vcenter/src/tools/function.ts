import { VMGuestPowerAction, VMPowerAction, VMSummary } from "../api/types";
import { vCenter } from "../api/vCenter";
import { InputVmGuestTasks, InputVmId, InputVmPowerTasks, OutputVmInfo } from "./type";

/**
 * Return Data in string format for LLM.
 */
export function DataToPromptListVm(data: Map<string, VMSummary[]>): string {
  let output = "List of VMs found:\n";
  data.forEach((value, server) => {
    const v = value.map((value) => {
      return { vcenter_id: server, ...value };
    });
    output += `${JSON.stringify(v)}\n`;
  });
  return output;
}

/**
 * Return Data in string format for LLM.
 */
export function DataToPromptVmInfo(data: OutputVmInfo[]): string {
  return `VMs Info: \n${JSON.stringify(data)}`;
}

/**
 * List all VMs on given vCenter Server.
 *
 * @param servers - vCenter Server Names.
 * @param searchParams - URL Search Parameters.
 * @returns Vm Summary Array.
 */
export async function ListVm(servers: Map<string, vCenter>, searchParams?: string): Promise<Map<string, VMSummary[]>> {
  /* Get VMSummary List */
  const vmSummary = new Map<string, VMSummary[] | Error>();
  await Promise.all(
    [...servers.entries()].map(async ([serverName, server]) => {
      vmSummary.set(
        serverName,
        await server.ListVM(searchParams).catch((e) => {
          return e;
        })
      );
    })
  );

  /* Verify Errors */
  vmSummary.forEach((value, server) => {
    if (value instanceof Error)
      throw new Error(`Error Getting Vm List from vCenter Server "${server}". Error: ${value.message}`);
  });

  return vmSummary as Map<string, VMSummary[]>;
}

/**
 * Get Detailed Vm Info.
 *
 * @param servers - vCenter Server Names.
 * @param vm - Object containing VM id and vCenter Name.
 * @returns VM Detailed Info.
 */
export async function GetVmInfo(servers: Map<string, vCenter>, vm: InputVmId): Promise<OutputVmInfo> {
  /* Get vCenter Server */
  const server = servers.get(vm.vcenterId);
  if (!server) throw new Error(`vCenter Server with name "${vm.vcenterId}" does not exist`);

  /* Get VM Info */
  const info = await server.GetVM(vm.vmId);

  return { info: info, ...vm };
}

/**
 * Generate a Console Ticket for given VM and return connection url.
 *
 * @param servers - vCenter Server Names.
 * @param vm - Object containing VM id and vCenter Name.
 * @returns Console Ticket Url.
 */
export async function GetVmConsoleUrl(servers: Map<string, vCenter>, vm: InputVmId): Promise<string> {
  /* Get vCenter Server */
  const server = servers.get(vm.vcenterId);
  if (!server) throw new Error(`vCenter Server with name "${vm.vcenterId}" does not exist`);

  /* Get Console Ticket */
  const ticket = await server.VMCreateConsoleTickets(vm.vmId);
  if (!ticket) throw new Error(`Can't generate a Console Ticket for vm "${vm.vmId}"`);
  return ticket.ticket;
}

/**
 * Run Vm Guest Power Action.
 *
 * @param servers - vCenter Server Names.
 * @param tasks - Guest Power Action to run.
 * @returns result of all tasks.
 */
export async function RunVmGuestTasks(servers: Map<string, vCenter>, tasks: InputVmGuestTasks): Promise<string> {
  /* Run Guest Power Action for all Tasks */
  const tasksResult = await Promise.all(
    tasks.tasks.map(async (task) => {
      /* Get vCenter Server */
      const server = servers.get(task.vm.vcenterId);
      if (!server) throw new Error(`vCenter Server with name "${task.vm.vcenterId}" does not exist`);

      /* Run Guest Power Action */
      return await server
        .VMGuestPower(task.vm.vmId, task.action as VMGuestPowerAction)
        .catch((e) => `* [${task.vm.vcenterId}] ${task.vm.vmId} - ${task.action}, Error: ${e}`);
    })
  );

  /* Read Tasks Result and pass to the LLM */
  let output: string | undefined;
  tasksResult.forEach((result) => {
    if (!output && !result) output = "Error running the following tasks:\n";
    if (!result) output += `${result}\n`;
  });
  if (!output) output = "All tasks done without errors";
  return output;
}

/**
 * Run Vm Guest Power Action.
 *
 * @param servers - vCenter Server Names.
 * @param tasks - Guest Power Action to run.
 * @returns result of all tasks.
 */
export async function RunVmPowerTasks(servers: Map<string, vCenter>, tasks: InputVmPowerTasks): Promise<string> {
  /* Run Power Action for all Tasks */
  const tasksResult = await Promise.all(
    tasks.tasks.map(async (task) => {
      /* Get vCenter Server */
      const server = servers.get(task.vm.vcenterId);
      if (!server) throw new Error(`vCenter Server with name "${task.vm.vcenterId}" does not exist`);

      /* Run Power Action */
      return await server
        .VMPower(task.vm.vmId, task.action as VMPowerAction)
        .catch((e) => `* [${task.vm.vcenterId}] ${task.vm.vmId} - ${task.action}, Error: ${e}`);
    })
  );

  /* Read Tasks Result and pass to the LLM */
  let output: string | undefined;
  tasksResult.forEach((result) => {
    if (!output && !result) output = "Error running the following tasks:\n";
    if (!result) output += `${result}\n`;
  });
  if (!output) output = "All tasks done without errors";
  return output;
}
