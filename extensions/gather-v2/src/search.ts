import { sendGatherKeystroke } from "./utils";

export default async function Command() {
  await sendGatherKeystroke("k", ["command down"]);
}
