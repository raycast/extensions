import { Clipboard, getPreferenceValues, LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import { fromString, toUUID } from "typeid-js";

export default async (props: LaunchProps<{ arguments: { typeID: string } }>) => {
  const { typeID } = props.arguments;
  if (!typeID) {
    await showToast({ style: Toast.Style.Failure, title: "No TypeID(s) provided" });
    return;
  }

  const { defaultAction } = getPreferenceValues<{ defaultAction: "copy" | "paste" }>();

  try {
    const typeIdInstance = fromString(typeID);
    const uuid = toUUID(typeIdInstance);

    if (defaultAction === "copy") {
      await Clipboard.copy(uuid);
    } else if (defaultAction === "paste") {
      await Clipboard.paste(uuid);
    }

    const action = defaultAction === "copy" ? "Copied" : "Pasted";
    await showHUD(`✅ ${action} decoded UUID: ${uuid}`);
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "Decoding Error", message: String(error) });
  }
};
