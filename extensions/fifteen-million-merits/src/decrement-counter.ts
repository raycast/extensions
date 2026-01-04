import { updateCounterAndFocus } from "./lib/storage";

export default async function Command() {
  await updateCounterAndFocus(-1);
}
