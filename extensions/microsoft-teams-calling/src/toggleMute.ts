import { directCommand } from "./directCommand";

export default async function ToggleMute() {
  await directCommand("toggle-mute", (msg) => (msg.meetingUpdate.meetingState?.isMuted ? "Muted" : "Unmuted"));
}
