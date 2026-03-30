import { getActionById, runLoopAction } from "./loop-utils";

export default async function Command() {
  const action = getActionById("center");
  if (action) {
    await runLoopAction(action);
  }
}
