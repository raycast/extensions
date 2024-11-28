import { directCommand } from "./directCommand";

export default async function ToggleVideo() {
  await directCommand("leave-call", (msg) => (msg.meetingUpdate.meetingState?.isCameraOn ? "Camera on" : "Camera off"));
}
