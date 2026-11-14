import { controlRecordPause } from "@/lib/output-control";

export default async function main() {
  await controlRecordPause({
    request: "PauseRecord",
    desiredPaused: true,
    message: "Recording paused",
    alreadyMessage: "Recording already paused",
  });
}
