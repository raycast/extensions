import { showHUD, Clipboard, showToast } from "@raycast/api";
import { TypeID } from "typeid-js";

interface TypeIDArguments {
  typeId: string;
}

export default async (props: { arguments: TypeIDArguments }) => {
  const { typeId } = props.arguments;

  try {
    const value = TypeID.fromString(typeId).toUUID();

    await Clipboard.copy(value);

    await showHUD(`✅ Copied ${value} to clipboard.`);
  } catch (error) {
    await showToast({
      title: "Invalid TypeID",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
