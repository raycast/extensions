import { controlOutput } from "@/lib/output-control";

export default async function main() {
  await controlOutput({
    label: "Replay Buffer",
    request: "StopReplayBuffer",
    statusRequest: "GetReplayBufferStatus",
    desiredActive: false,
    activeMessage: "Replay buffer started",
    inactiveMessage: "Replay buffer stopped",
  });
}
