import { showHUD, Clipboard, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { monotonicFactory } from "ulidx";

// This is required to ensure generated ULIDs are sortable
// https://github.com/ulid/javascript#monotonic-ulids
const ulid = monotonicFactory();

interface ULIDArguments {
  numberOfULIDsToGenerate: string;
}

interface Preferences {
  upperCaseLetters: boolean;
  defaultAction: string;
}

// don't want to cause a heap error, so cap it 😱
const ULID_MAX_NUMBER = 10000;

export default async (props: { arguments: ULIDArguments }) => {
  let { numberOfULIDsToGenerate } = props.arguments;
  const { upperCaseLetters, defaultAction } = getPreferenceValues<Preferences>();

  if (!numberOfULIDsToGenerate) {
    numberOfULIDsToGenerate = "1";
  }

  try {
    const parseableNumber = parseInt(numberOfULIDsToGenerate, 10);

    if (isNaN(parseableNumber)) {
      throw new Error("INVALID_NUMBER");
    }

    // safe?
    if (parseableNumber <= ULID_MAX_NUMBER) {
      let ulids = Array.from(Array(parseableNumber)).map(() => ulid(150000));
      if (upperCaseLetters) {
        ulids = ulids.map((element) => element.toUpperCase());
      }

      if (defaultAction === "copy") {
        await Clipboard.copy(ulids.join("\r\n"));
      } else if (defaultAction === "paste") {
        await Clipboard.paste(ulids.join("\r\n"));
      }
      const action = defaultAction === "copy" ? "Copied" : "Pasted";
      const successMessage = ulids.length > 1 ? `${action} ${ulids.length} new ULIDs.` : `${action} new ULID: ${ulids}`;
      await showHUD(`✅ ${successMessage}`);
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Too many ULIDs requested.",
        message: `${parseableNumber} exceeds maximum ULIDs of ${ULID_MAX_NUMBER}. Try a lower number.`,
      });
    }
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid number.",
      message: "An invalid number has been provided. Try an actual number.",
    });
  }
};
