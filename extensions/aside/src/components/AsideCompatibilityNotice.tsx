import { Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getAsideVersion } from "../lib/browser";
import { asideCompatibilityWarning } from "../lib/version";

export function AsideCompatibilityNotice() {
  const { data: version } = useCachedPromise(getAsideVersion);
  const warning = version ? asideCompatibilityWarning(version) : undefined;

  if (!warning) return null;

  return (
    <List.Section title="Compatibility">
      <List.Item icon={Icon.Warning} title={warning.title} subtitle={warning.subtitle} />
    </List.Section>
  );
}
