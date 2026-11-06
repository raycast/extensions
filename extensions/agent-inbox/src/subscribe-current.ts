import { subscribeCurrent } from "./lib/subscribe-current";

/** A root command so current-window subscription can have its own global hotkey. */
export default async function SubscribeCurrent() {
  await subscribeCurrent();
}
