import { HAServiceCallPayload } from "@components/services/utils";
import { ha } from "@lib/common";
import { launchCommand, LaunchProps, LaunchType, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export default async function RunServiceMain({ launchContext }: LaunchProps<{ launchContext?: HAServiceCallPayload }>) {
  try {
    if (!launchContext) {
      // if no launch context given redirect to the services command
      await launchCommand({ name: "services", type: LaunchType.UserInitiated });
      return;
    }
    console.log("runService context: ", JSON.stringify(launchContext));
    const domain = launchContext?.domain;
    if (domain === undefined || domain === null || typeof domain !== "string" || domain.trim().length <= 0) {
      throw new Error("Invalid Service Domain");
    }
    const service = launchContext?.service;
    if (service === undefined || service === null || typeof service !== "string" || service.trim().length <= 0) {
      throw new Error("Invalid Service Name");
    }
    const data = launchContext?.data;
    await ha.callService(domain, service, data);
    await showToast(Toast.Style.Success, `Calling ${domain}.${service} Successful`);
  } catch (error) {
    showFailureToast(error, { title: "Error Calling Service" });
  }
}
