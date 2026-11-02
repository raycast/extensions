import { openProfileAtIndex } from "./open-profile-slot";

export default async function Command() {
  await openProfileAtIndex(1);
}
