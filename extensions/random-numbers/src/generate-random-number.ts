import { LaunchProps, showHUD } from "@raycast/api";
import { randomNumberBetween } from "./random";
import maybeWait from "./delay";

export default async function Command(props: LaunchProps<{ arguments: Arguments.GenerateRandomNumber }>) {
  const min = parseInt(props.arguments.min);
  const max = parseInt(props.arguments.max);
  if (isNaN(min) || isNaN(max)) {
    showHUD("Please enter integer values.", { clearRootSearch: true });
  } else {
    const value = randomNumberBetween(min, max).toString();
    await maybeWait();
    showHUD(`${value}`, { clearRootSearch: true });
  }
}
