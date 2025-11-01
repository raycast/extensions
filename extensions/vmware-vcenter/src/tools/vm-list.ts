import { getPreferenceValues } from "@raycast/api";
import { GetServer } from "../api/function";
import { errorNoServerConfigured } from "./errors";
import { DataToPromptListVm, ListVm } from "./function";
import { InputVmList } from "./type";

const pref = getPreferenceValues();
if (!pref.certificate) process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

/**
 * Provides a list of available virtual machines with basic information present on the configured VMware vCenter infrastructure.
 * Basic information are:
 *  - "vcenter_id": vCenter Server Identifier.
 *  - "memory_size_MiB": RAM Assigned in MiB.
 *  - "vm": VM Identifier.
 *  - "name": VM Name.
 *  - "power_state": VM Power State. Can be only one of this value: "POWERED_ON", "POWERED_OFF", "SUSPENDED".
 *  - "cpu_count": Number of assigned cpu core.
 */
export default async function tool(input: InputVmList): Promise<string> {
  /* Get vCenter Servers */
  const servers = await GetServer();
  if (!servers) throw errorNoServerConfigured;

  /* List Virtual Machines */
  const vmSummary = await ListVm(servers, input.searchParams);

  /* Return data in string format */
  return DataToPromptListVm(vmSummary);
}
