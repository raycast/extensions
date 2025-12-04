import { getPreferenceValues, Tool } from "@raycast/api";
import { GetServer } from "../api/function";
import { errorNoServerConfigured } from "./errors";
import { GetVmInfo, RunVmGuestTasks } from "./function";
import { InputVmGuestTasks, OutputVmInfo } from "./type";

const pref = getPreferenceValues();
if (!pref.certificate) process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

export const confirmation: Tool.Confirmation<InputVmGuestTasks> = async (input) => {
  /* Get vCenter Servers */
  const servers = await GetServer();
  if (!servers) throw errorNoServerConfigured;

  /* Get VMs Info */
  const vmsInfo = await Promise.all(
    input.tasks.map(async (task): Promise<OutputVmInfo> => {
      const info = await GetVmInfo(servers, task.vm).catch((e) => {
        console.error(e);
        return task.vm;
      });
      return info;
    })
  );

  /* Get Message to Show */
  let message = "**Confirm the execution** of following tasks:\n";
  vmsInfo.forEach((vm, i) => (message += `* [${vm.vcenterId}] **${vm.info?.name}** - **${input.tasks[i].action}**\n`));

  return {
    message: message,
  };
};

/**
 * Reboot, Shutdown or Standby one or more Virtual Machine using VMware Guest Agent.
 */
export default async function tool(input: InputVmGuestTasks): Promise<string> {
  /* Get vCenter Servers */
  const servers = await GetServer();
  if (!servers) throw errorNoServerConfigured;

  /* Run Tasks */
  return await RunVmGuestTasks(servers, input);
}
