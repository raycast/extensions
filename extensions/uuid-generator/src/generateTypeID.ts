import { Clipboard, getPreferenceValues, LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import { typeid } from "typeid-js";

import { generateUuids } from "./utils/uuidUtils";
import { UUIDType } from "./uuidHistory";

// don't want to cause a heap error, so cap it 😱
const UUID_MAX_NUMBER = 10000;

export default async (props: LaunchProps<{ arguments: Arguments.GenerateTypeID }>) => {
  if (!props.arguments.numberOfUUIDsToGenerate) props.arguments.numberOfUUIDsToGenerate = "1";

  const { prefix, numberOfUUIDsToGenerate } = props.arguments;
  const { upperCaseLetters, defaultAction } = getPreferenceValues<Preferences.GenerateTypeID>();

  try {
    const parseableNumber = parseInt(numberOfUUIDsToGenerate, 10);

    if (isNaN(parseableNumber)) {
      throw new Error("INVALID_NUMBER");
    }

    // safe?
    if (parseableNumber <= UUID_MAX_NUMBER) {
      const uuids = await generateUuids(
        () => typeid(prefix).toString(),
        parseableNumber,
        upperCaseLetters,
        UUIDType.TYPEID,
      );

      if (defaultAction === "copy") {
        await Clipboard.copy(uuids.join("\r\n"));
      } else if (defaultAction === "paste") {
        await Clipboard.paste(uuids.join("\r\n"));
      }
      const action = defaultAction === "copy" ? "Copied" : "Pasted";
      const successMessage = uuids.length > 1 ? `${action} ${uuids.length} new UUIDs.` : `${action} new UUID: ${uuids}`;
      await showHUD(`✅ ${successMessage}`);
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Too many UUIDs requested.",
        message: `${parseableNumber} exceeds maximum UUIDs of ${UUID_MAX_NUMBER}. Try a lower number.`,
      });
    }
  } catch (e) {
    switch ((e as { message: string }).message) {
      case "INVALID_NUMBER":
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid number.",
          message: "An invalid number has been provided. Try an actual number.",
        });
        break;
      case "Invalid prefix. Must be at most 63 ascii letters [a-z_]":
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid prefix.",
          message: "Must be at most 63 ascii letters [a-z_]",
        });
        break;
    }
  }
};
