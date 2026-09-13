import { controlOutput } from "@/lib/output-control";

export default async function main() {
  await controlOutput({
    label: "Streaming",
    request: "StartStream",
    statusRequest: "GetStreamStatus",
    desiredActive: true,
    activeMessage: "Streaming",
    inactiveMessage: "Streaming stopped",
  });
}
