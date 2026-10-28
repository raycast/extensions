import { controlRecordPause } from "@/lib/output-control";

export default async function main() {
  await controlRecordPause({
    request: "ResumeRecord",
    desiredPaused: false,
    message: "Recording resumed",
    alreadyMessage: "Recording already resumed",
  });
}
