import { showToast, Toast } from "@raycast/api";
import { getState, setState } from "./state";

export default async function main() {
  const state = await getState();

  if (!state.isRunning) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Chronometer is not running",
    });
    return;
  }

  await setState({
    ...state,
    isRunning: false,
  });

  await showToast({
    style: Toast.Style.Success,
    title: "Chronometer stopped",
  });
}
