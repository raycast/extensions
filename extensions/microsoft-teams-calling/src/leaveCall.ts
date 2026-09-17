import { directCommand } from "./directCommand";

export default async function LeaveCall() {
  // Leaving a call has no resulting state worth surfacing, so we show no HUD on success.
  await directCommand("leave-call");
}
