import { LaunchProps } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { applicationToFinder, clipboardToApplication, finderToApplication, isTerminal } from "./utils";

export default async function (props: LaunchProps<{ arguments: Arguments.Index }>) {
  const { from, to } = props.arguments;
  try {
    if (from === "Clipboard" && isTerminal(to)) {
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
