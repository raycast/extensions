import { controlOutput } from "@/lib/output-control";

export default async function main() {
  await controlOutput({
    label: "Virtual Camera",
    request: "StopVirtualCam",
    statusRequest: "GetVirtualCamStatus",
    desiredActive: false,
    activeMessage: "Virtual Camera started",
    inactiveMessage: "Virtual Camera stopped",
  });
}
