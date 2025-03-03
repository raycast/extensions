import { showHUD, Clipboard, getPreferenceValues, showToast, Toast, LaunchProps } from "@raycast/api";
import { v5 as uuidV5, validate as uuidValidate } from "uuid";

import { generateUuids } from "./utils/uuidUtils";
import { UUIDType } from "./uuidHistory";

// don't want to cause a heap error, so cap it 😱
const UUID_MAX_NUMBER = 10000;

export default async (props: LaunchProps<{ arguments: Arguments.GenerateV5 }>) => {
  let { numberOfUUIDsToGenerate } = props.arguments;
  const { name } = props.arguments;
  const { upperCaseLetters, uuidNamespace, defaultAction } = getPreferenceValues<Preferences.GenerateV5>();

  if (!numberOfUUIDsToGenerate) {
    numberOfUUIDsToGenerate = "1";
  }

  try {
    const parseableNumber = parseInt(numberOfUUIDsToGenerate, 10);

    if (isNaN(parseableNumber)) {
      throw new Error("INVALID_NUMBER");
    }

    if (!uuidValidate(uuidNamespace)) {
      throw new Error("INVALID_NAMESPACE");
    }

    // safe?
    if (parseableNumber <= UUID_MAX_NUMBER) {
      const uuids = await generateUuids(
        () => uuidV5(name, uuidNamespace),
        parseableNumber,
        upperCaseLetters,
        UUIDType.UUIDV5,
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
      case "INVALID_NAMESPACE":
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid namespace.",
          message: "An invalid namespace has been defined. A namespace must be a valid UUID.",
        });
        break;
      case "INVALID_NUMBER":
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid number.",
          message: "An invalid number has been provided. Try an actual number.",
        });
        break;
    }
  }
};
