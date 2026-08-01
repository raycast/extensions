import {
  Clipboard,
  getPreferenceValues,
  LaunchProps,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { formatMyNumber, generateMyNumber } from "./mynumber";

const MY_NUMBERS_MAX_NUMBER = 10000;

interface Preferences {
  defaultAction: "copy" | "paste";
  hyphenSeparated: boolean;
  defaultNumberOfMyNumbers: string;
}

export default async function Command(
  props: LaunchProps<{ arguments: Arguments.GenerateMynumber }>,
) {
  const { defaultAction, hyphenSeparated, defaultNumberOfMyNumbers } =
    getPreferenceValues<Preferences>();

  const numberArg = props.arguments.numberOfMyNumbersToGenerate?.trim() || defaultNumberOfMyNumbers;
  const numberOfMyNumbers = Number(numberArg);

  if (!Number.isInteger(numberOfMyNumbers) || numberOfMyNumbers < 1) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid number",
      message: `"${numberArg}" is not a positive integer.`,
    });
    return;
  }

  if (numberOfMyNumbers > MY_NUMBERS_MAX_NUMBER) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Too many Mynumbers requested",
      message: `${numberOfMyNumbers} exceeds the maximum of ${MY_NUMBERS_MAX_NUMBER}.`,
    });
    return;
  }

  const myNumbers = Array.from({ length: numberOfMyNumbers }, () =>
    formatMyNumber(generateMyNumber(), hyphenSeparated),
  );
  const output = myNumbers.join("\r\n");
  const label = numberOfMyNumbers === 1 ? "Mynumber" : `${numberOfMyNumbers} Mynumbers`;

  if (defaultAction === "paste") {
    await Clipboard.paste(output);
    await showHUD(`✅ Pasted ${label}`);
  } else {
    await Clipboard.copy(output);
    await showHUD(`✅ Copied ${label}`);
  }
}
