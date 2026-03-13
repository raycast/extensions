import { toggleMute } from "./utils/kaset";

export default async function Command() {
  await toggleMute();
}
