import { unpin } from "./utils/agent-ipc";

export default async function Command() {
  await unpin();
}
