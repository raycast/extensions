import { Clipboard, getPreferenceValues, LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import { TypeID } from "typeid-js";
import { parse as parseUuid } from "uuid"; // Import UUID parsing function

/**
 * Given a suffix and UUID, generates a 'packed type ID'.
 *
 * For example: '0195b514-74a3-7250-b9bb-70e07500ed8b' with suffix 'doctor' becomes 'doctor_01jpth8x53e98bkevgw1tg1vcb'.
 */

export default async (props: LaunchProps<{ arguments: Arguments.PackTypeID }>) => {
  const { suffix, uuid } = props.arguments;
  const { upperCaseLetters, defaultAction } = getPreferenceValues<Preferences.PackTypeID>();

  try {
    // Validate inputs
    if (!suffix) {
      throw new Error("MISSING_SUFFIX");
    }

    if (!uuid) {
      throw new Error("MISSING_UUID");
    }

    // Parse the UUID to get its binary representation
    const parsedUuid = parseUuid(uuid);

    // Use TypeID.fromUUIDBytes to convert the UUID to a TypeID with the given suffix
    const packedId = TypeID.fromUUIDBytes(suffix, parsedUuid).toString();

    // Apply case formatting if needed
    const formattedResult = upperCaseLetters ? packedId.toUpperCase() : packedId;

    // Handle clipboard based on preference
    if (defaultAction === "copy") {
      await Clipboard.copy(formattedResult);
    } else if (defaultAction === "paste") {
      await Clipboard.paste(formattedResult);
    }

    const action = defaultAction === "copy" ? "Copied" : "Pasted";
    await showHUD(`✅ ${action} packed type ID: ${formattedResult}`);
  } catch (e) {
    const errorMessage = (e as { message: string }).message;

    switch (errorMessage) {
      case "MISSING_SUFFIX":
        await showToast({
          style: Toast.Style.Failure,
          title: "Missing suffix.",
          message: "A suffix is required to generate a packed type ID.",
        });
        break;
      case "MISSING_UUID":
        await showToast({
          style: Toast.Style.Failure,
          title: "Missing UUID.",
          message: "A UUID is required to generate a packed type ID.",
        });
        break;
      case "Invalid prefix. Must be at most 63 ascii letters [a-z_]":
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid suffix.",
          message: "Must be at most 63 ascii letters [a-z_]",
        });
        break;
      default:
        await showToast({
          style: Toast.Style.Failure,
          title: "Error generating packed type ID.",
          message: errorMessage,
        });
    }
  }
};
