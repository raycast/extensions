import { stopFocusFlow } from "./actions";

export default async function Command() {
  await stopFocusFlow();
}
