import { Color, Icon, LaunchType, MenuBarExtra, launchCommand, open, showHUD } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { accountId, consoleUrl, getPage, sameAccount } from "./api";
import { relative } from "./format";
import { Screen } from "./types";

async function allScreens(): Promise<Screen[]> {
  const out: Screen[] = [];
  let cursor: string | undefined;
  do {
    const page = await getPage<Screen>("/v1/screens", { limit: 500, cursor });
    out.push(...page.data);
    cursor = page.nextCursor ?? undefined;
  } while (cursor && out.length < 5000);
  return out;
}

export default function ScreenStatus() {
  // The account id keeps each key's counts apart in the cache. Errors show in the menu itself.
  const { data, isLoading, error } = useCachedPromise(
    (account: string) => {
      sameAccount(account);
      return allScreens();
    },
    [accountId()],
    {
      onError: () => undefined,
    },
  );

  const live = (data ?? []).filter((s) => !s.deactivatedAt && s.status !== "pairing");
  const offline = live.filter((s) => s.status === "offline").sort((a, b) => a.name.localeCompare(b.name));
  const online = live.length - offline.length;

  const icon = error
    ? { source: Icon.Warning, tintColor: Color.Orange }
    : offline.length > 0
      ? { source: Icon.Monitor, tintColor: Color.Red }
      : { source: Icon.Monitor, tintColor: { light: "#000000", dark: "#ffffff", adjustContrast: false } };

  return (
    <MenuBarExtra
      icon={icon}
      title={data && offline.length > 0 ? String(offline.length) : undefined}
      tooltip={error ? "Brix: could not load screens" : `Brix: ${online} online, ${offline.length} offline`}
      isLoading={isLoading}
    >
      {error ? <MenuBarExtra.Item title={error.message} /> : null}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title={`${online} online`} icon={{ source: Icon.CircleFilled, tintColor: Color.Green }} />
        <MenuBarExtra.Item
          title={`${offline.length} offline`}
          icon={{ source: Icon.CircleFilled, tintColor: Color.Red }}
        />
      </MenuBarExtra.Section>
      {offline.length > 0 ? (
        <MenuBarExtra.Section title="Offline">
          {offline.slice(0, 25).map((s) => (
            <MenuBarExtra.Item
              key={s.id}
              title={s.name}
              subtitle={s.lastSeenAt ? relative(s.lastSeenAt) : undefined}
              onAction={() => open(consoleUrl.screen(s.id))}
            />
          ))}
          {offline.length > 25 ? (
            <MenuBarExtra.Item
              title={`${offline.length - 25} more…`}
              onAction={() => open(`${consoleUrl.screens()}?status=offline`)}
            />
          ) : null}
        </MenuBarExtra.Section>
      ) : null}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Search Screens"
          icon={Icon.MagnifyingGlass}
          onAction={async () => {
            try {
              await launchCommand({ name: "search-screens", type: LaunchType.UserInitiated });
            } catch (error) {
              // A menu bar command has no Toast API, so the failure shows as a HUD.
              await showHUD(`Could not open Search Screens: ${error instanceof Error ? error.message : String(error)}`);
            }
          }}
        />
        <MenuBarExtra.Item title="Open Brix" icon={Icon.Globe} onAction={() => open(consoleUrl.screens())} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
