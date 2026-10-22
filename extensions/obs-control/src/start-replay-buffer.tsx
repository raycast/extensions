import { controlOutput } from "@/lib/output-control";

export default async function main() {
  await controlOutput({
    label: "Replay Buffer",
    request: "StartReplayBuffer",
    statusRequest: "GetReplayBufferStatus",
    desiredActive: true,
    activeMessage: "Replay buffer started",
    inactiveMessage: "Replay buffer stopped",
  });
}
