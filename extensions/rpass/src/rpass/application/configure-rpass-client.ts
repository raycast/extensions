import { getPreferenceValues } from "@raycast/api";
import { setGpgExecutablePath, setRpassExecutablePath } from "./rpass-client";

export function configureRpassClientFromPreferences(): void {
  const { rpassExecutablePath, gpgExecutablePath } =
    getPreferenceValues<Preferences>();
  setRpassExecutablePath(rpassExecutablePath);
  setGpgExecutablePath(gpgExecutablePath);
}
