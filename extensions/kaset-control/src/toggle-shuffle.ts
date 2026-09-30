import { toggleShuffle } from "./utils/kaset";

export default async function Command() {
  await toggleShuffle();
}
