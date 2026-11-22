import { environment, LaunchType, showHUD } from "@raycast/api";
import { forgetMapping } from "./redact";

export default async function Command() {
  // Raycast also runs this every 10 minutes (see `interval` in package.json),
  // which only clears a mapping past its one-hour lifetime.
  if (environment.launchType === LaunchType.Background) {
    await forgetMapping(true);
    return;
  }
  const forgot = await forgetMapping(false);
  await showHUD(
    forgot ? "Forgot the last redaction's values" : "Nothing stored to forget",
  );
}
