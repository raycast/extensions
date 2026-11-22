import { environment, LaunchType, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { forgetMapping } from "./redact";

export default async function Command() {
  // Raycast also runs this every 10 minutes (see `interval` in package.json),
  // which only clears a mapping past its one-hour lifetime.
  if (environment.launchType === LaunchType.Background) {
    await forgetMapping(true);
    return;
  }
  try {
    const forgot = await forgetMapping(false);
    await showHUD(
      forgot
        ? "Forgot the last redaction's values"
        : "Nothing stored to forget",
    );
  } catch (error) {
    await showFailureToast(error, {
      title: "Could not forget the last redaction",
    });
  }
}
