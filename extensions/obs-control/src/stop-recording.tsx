import { controlOutput } from "@/lib/output-control";

export default async function main() {
  await controlOutput({
    label: "Recording",
    request: "StopRecord",
    statusRequest: "GetRecordStatus",
    desiredActive: false,
    activeMessage: "Recording",
    inactiveMessage: "Recording stopped",
  });
}
