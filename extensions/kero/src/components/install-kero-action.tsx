import { Action, Icon } from "@raycast/api";
import { KeroError } from "../lib/kero";

export function InstallKeroAction({ error }: { error?: unknown }) {
  if (!(error instanceof KeroError) || error.kind !== "missing-cli") return null;
  return (
    <Action.OpenInBrowser title="Download Kero" icon={Icon.Download} url="https://github.com/egoist/kero/releases" />
  );
}
