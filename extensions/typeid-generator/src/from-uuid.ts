import { showHUD, Clipboard, showToast } from "@raycast/api";
import { TypeID } from "typeid-js";

interface TypeIDArguments {
  type?: string;
  uuid: string;
}

export default async (props: { arguments: TypeIDArguments }) => {
  const { uuid, type = "" } = props.arguments;

  try {
    const value = TypeID.fromUUID(type, uuid).toString();

    await Clipboard.copy(value);

    await showHUD(`✅ Copied ${value} to clipboard.`);
  } catch (error) {
    await showToast({
      title: "Invalid TypeID",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
