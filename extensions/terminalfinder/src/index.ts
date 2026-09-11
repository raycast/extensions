import { LaunchProps } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import clipboardToCmux from "./clipboardToCmux";
import cmuxToFinder from "./cmuxToFinder";
import finderToCmux from "./finderToCmux";
import { applicationToFinder, clipboardToApplication, finderToApplication, isTerminal } from "./utils";

export default async function (props: LaunchProps<{ arguments: Arguments.Index }>) {
  const { from, to } = props.arguments;
  try {
    if (from === "Clipboard" && to === "cmux") {
      await clipboardToCmux();
    } else if (from === "Finder" && to === "cmux") {
      await finderToCmux();
    } else if (from === "cmux" && to === "Finder") {
      await cmuxToFinder();
    } else if (from === "Clipboard" && isTerminal(to)) {
      await clipboardToApplication(to);
    } else if (from === "Finder" && isTerminal(to)) {
      await finderToApplication(to);
    } else if (isTerminal(from) && to === "Finder") {
      await applicationToFinder(from);
    } else {
      throw new Error("Invalid combination");
    }
  } catch (error) {
    await showFailureToast(error);
  }
}
