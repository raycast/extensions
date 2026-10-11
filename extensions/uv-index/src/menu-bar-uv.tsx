import { Icon, MenuBarExtra, openExtensionPreferences } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchUV, uvLevel } from "./uv";

export default function Command() {
  const { data, isLoading, error, revalidate } = useCachedPromise(fetchUV);

  return (
    <MenuBarExtra icon={Icon.Sun} title={data ? String(data.uv) : undefined} isLoading={isLoading} tooltip="UV Index">
      {data && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title={`UV ${data.uv} · ${uvLevel(data.uv)}`} subtitle={data.place} />
          <MenuBarExtra.Item title={`Peak today: ${data.max} · ${uvLevel(data.max)}`} />
        </MenuBarExtra.Section>
      )}
      {error && !data && <MenuBarExtra.Item title="Couldn't get UV index" />}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Refresh" onAction={revalidate} />
        <MenuBarExtra.Item title="Change City" onAction={openExtensionPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
