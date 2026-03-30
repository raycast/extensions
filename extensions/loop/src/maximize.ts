import { getActionById, runLoopAction } from "./loop-utils";

export default async function Command() {
  const action = getActionById("maximize");
  if (action) {
    await runLoopAction(action);
  }
}
