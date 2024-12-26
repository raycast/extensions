import { showHUD, Clipboard, getPreferenceValues, showToast, Toast, LaunchProps } from "@raycast/api";
import { typeid } from "typeid-js";
import { v7 as uuidV7 } from "uuid";

import { generateUuids } from "./utils/uuidUtils";
import { UUIDType } from "./uuidHistory";

// don't want to cause a heap error, so cap it 😱
const UUID_MAX_NUMBER = 10000;

export default async (props: LaunchProps<{ arguments: Arguments.GenerateV7 }>) => {
  let { numberOfUUIDsToGenerate } = props.arguments;
  const { upperCaseLetters, defaultAction, base32Encoding } = getPreferenceValues<Preferences.GenerateV7>();

  if (!numberOfUUIDsToGenerate) {
    numberOfUUIDsToGenerate = "1";
  }

  try {
    const parseableNumber = parseInt(numberOfUUIDsToGenerate, 10);

    if (isNaN(parseableNumber)) {
      throw new Error("INVALID_NUMBER");
    }

    // safe?
    if (parseableNumber <= UUID_MAX_NUMBER) {
      const generator = base32Encoding ? () => typeid("").toString() : uuidV7;
      const uuids = await generateUuids(generator, parseableNumber, upperCaseLetters, UUIDType.UUIDV7);

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
    }
  }
};
