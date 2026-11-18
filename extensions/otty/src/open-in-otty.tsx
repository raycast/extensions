import { openOtty } from "./lib/otty";

export default async function Command() {
  await openOtty();
}
