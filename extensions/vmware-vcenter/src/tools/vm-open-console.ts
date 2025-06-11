import { getPreferenceValues, open } from "@raycast/api";
import { GetServer } from "../api/function";
import { errorNoServerConfigured } from "./errors";
import { GetVmConsoleUrl } from "./function";
import { InputVmIds } from "./type";

const pref = getPreferenceValues();
if (!pref.certificate) process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

/**
 * Open virtual machine console for remote management.
 */
export default async function tool(input: InputVmIds): Promise<string | void> {
  /* Get vCenter Servers */
  const servers = await GetServer();
  if (!servers) throw errorNoServerConfigured;

  /* Get Console Tickets */
  const tickets = await Promise.all(
    input.vm.map(async (vm) => {
      return await GetVmConsoleUrl(servers!, vm).catch((e) => {
        return e;
      });
    })
  );

  /* Open Console with Tickets */
  let errorCounter = 0;
  let output: string | undefined;
  let opened = false;
  for (const ticket of tickets) {
    /* Check Errors */
    if (ticket instanceof Error) {
      if (!output) output = "Error running the following tasks:";
      output += `\n* ${ticket}`;
      errorCounter += 1;
      continue;
    }

    /* Open Console and Wait */
    await open(ticket);
    if (!opened)
      await new Promise((resolve) =>
        setTimeout(() => {
          opened = true;
          resolve(undefined);
        }, 1000)
      );
  }

  /* Pass result to the LLM */
  if (errorCounter === tickets.length) throw new Error(output);
  if (!output) output = "All Console opened";
  return output;
}
