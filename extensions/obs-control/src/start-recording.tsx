import { controlOutput } from "@/lib/output-control";

export default async function main() {
  await controlOutput({
    label: "Recording",
    request: "StartRecord",
    statusRequest: "GetRecordStatus",
    desiredActive: true,
    activeMessage: "Recording",
    inactiveMessage: "Recording stopped",
  });
}
