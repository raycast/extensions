import { controlOutput } from "@/lib/output-control";

export default async function main() {
  await controlOutput({
    label: "Streaming",
    request: "StopStream",
    statusRequest: "GetStreamStatus",
    desiredActive: false,
    activeMessage: "Streaming",
    inactiveMessage: "Streaming stopped",
  });
}
