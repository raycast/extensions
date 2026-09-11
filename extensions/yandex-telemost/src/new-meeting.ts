import { createMeeting } from "./create-meeting";

export default async function Command() {
  await createMeeting(false);
}
