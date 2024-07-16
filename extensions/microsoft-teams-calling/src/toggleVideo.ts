import { directCommand } from "./directCommand";

export default async function ToggleVideo() {
  await directCommand("toggle-video", (msg) =>
    msg.meetingUpdate.meetingState?.isCameraOn ? "Camera on" : "Camera off"
  );
}
