import { pinActiveWindow } from "./utils/agent-ipc";

export default async function Command() {
  await pinActiveWindow();
}
