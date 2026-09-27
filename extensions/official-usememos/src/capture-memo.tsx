import { showHUD, type LaunchProps } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { createMemo } from "./api/memo";
import { getDefaultVisibility, getMemosConnection } from "./helpers/preferences";

const CaptureMemoCommand = async (props: LaunchProps<{ arguments: Arguments.CaptureMemo }>) => {
  const text = props.arguments.text.trim();
  if (text === "") {
    await showHUD("Type some text to save");
    return;
  }

  try {
    await createMemo(getMemosConnection(), { content: text, visibility: getDefaultVisibility() });
    await showHUD("Saved memo");
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't save memo" });
  }
};

export default CaptureMemoCommand;
