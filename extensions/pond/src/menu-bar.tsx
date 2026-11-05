import {
  Color,
  environment,
  Icon,
  Keyboard,
  LaunchType,
  launchCommand,
  MenuBarExtra,
  open,
  openCommandPreferences,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { pond } from "./api/client";
import { problemCopy, problemOf, toError } from "./api/problems";
import { kindIcon } from "./components/save-item";
import { saveTitle } from "./lib/display";
import { DOWNLOAD_URL, isWebUrl, LIBRARY_LINK, saveLink } from "./lib/links";
import { recordOpened } from "./lib/recent";

const RECENT = 8;
const ICON = { source: "menu-bar.png", tintColor: Color.PrimaryText };

async function loadSummary() {
  const api = pond();
  const [info, page] = await Promise.all([
    api.libraryInfo(),
    api.query({ sortKey: "savedAt", sortDir: "desc", limit: RECENT, include: ["saves"] }),
  ]);
  return { info, saves: page.saves ?? [] };
}

function run(name: string) {
  return () => launchCommand({ name, type: LaunchType.UserInitiated });
}

export default function Command() {
  const summary = useCachedPromise(loadSummary, [], { keepPreviousData: true });
  const problem = summary.error ? problemOf(toError(summary.error)) : null;
  const away = problem?.kind === "not-running" || problem?.kind === "not-installed";

  /** Pond owns its own tray; with Pond closed, a background refresh hides this item instead of waking it. */
  if (away && environment.launchType === LaunchType.Background) return null;

  const info = problem ? undefined : summary.data?.info;
  const saves = problem ? [] : (summary.data?.saves ?? []);
  const capturing = info ? info.queue.pending + info.queue.running : 0;

  return (
    <MenuBarExtra
      icon={ICON}
      title={capturing ? String(capturing) : undefined}
      tooltip={capturing ? `Pond is capturing ${capturing} saves` : "Pond"}
      isLoading={summary.isLoading}
    >
      {problem && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title={problemCopy(problem).title} icon={Icon.ExclamationMark} />
          {problem.kind === "not-installed" ? (
            <MenuBarExtra.Item title="Get Pond" icon={Icon.Download} onAction={() => open(DOWNLOAD_URL)} />
          ) : (
            <MenuBarExtra.Item title="Open Pond" icon={Icon.AppWindow} onAction={() => open(LIBRARY_LINK)} />
          )}
        </MenuBarExtra.Section>
      )}
      {info && (
        <MenuBarExtra.Section title={info.name}>
          <MenuBarExtra.Item
            title={`${info.counts.active.toLocaleString()} Saves`}
            icon={Icon.Tray}
            onAction={() => open(LIBRARY_LINK)}
          />
          {capturing > 0 && (
            <MenuBarExtra.Item
              title={`Capturing ${capturing.toLocaleString()}`}
              icon={{ source: Icon.CircleProgress50, tintColor: Color.Orange }}
              onAction={() => open(LIBRARY_LINK)}
            />
          )}
          {info.counts.failed > 0 && (
            <MenuBarExtra.Item
              title={`${info.counts.failed.toLocaleString()} Failed`}
              icon={{ source: Icon.Warning, tintColor: Color.Red }}
              onAction={() => open(LIBRARY_LINK)}
            />
          )}
        </MenuBarExtra.Section>
      )}
      {saves.length > 0 && (
        <MenuBarExtra.Section title="Recent Saves">
          {saves.map((save) => (
            <MenuBarExtra.Item
              key={save.id}
              title={saveTitle(save)}
              icon={kindIcon(save)}
              tooltip={save.url}
              onAction={async () => {
                await recordOpened(save);
                await open(saveLink(save));
              }}
              alternate={
                isWebUrl(save.url) ? (
                  <MenuBarExtra.Item
                    title={`Open Original: ${saveTitle(save)}`}
                    icon={Icon.Globe}
                    onAction={async () => {
                      await recordOpened(save);
                      await open(save.url);
                    }}
                  />
                ) : undefined
              }
            />
          ))}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Save Current Tab"
          icon={Icon.Globe}
          shortcut={Keyboard.Shortcut.Common.Save}
          onAction={run("save-current-tab")}
        />
        <MenuBarExtra.Item
          title="Save URL"
          icon={Icon.Plus}
          shortcut={Keyboard.Shortcut.Common.New}
          onAction={run("save-url")}
        />
        <MenuBarExtra.Item
          title="Search Saves"
          icon={Icon.MagnifyingGlass}
          shortcut={{ modifiers: ["cmd"], key: "f" }}
          onAction={run("search-saves")}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Pond"
          icon={Icon.AppWindow}
          shortcut={Keyboard.Shortcut.Common.Open}
          onAction={() => open(LIBRARY_LINK)}
        />
        <MenuBarExtra.Item title="Configure Command" icon={Icon.Gear} onAction={openCommandPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
