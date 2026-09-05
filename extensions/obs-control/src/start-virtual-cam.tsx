import { controlOutput } from "@/lib/output-control";

export default async function main() {
  await controlOutput({
    label: "Virtual Camera",
    request: "StartVirtualCam",
    statusRequest: "GetVirtualCamStatus",
    desiredActive: true,
    activeMessage: "Virtual Camera started",
    inactiveMessage: "Virtual Camera stopped",
  });
}
