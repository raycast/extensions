import { Icon, Image, launchCommand, LaunchType, MenuBarExtra, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { favicon, spaceLabel } from "./components";
import { groupOf, listSessions } from "./sessions";
import { activateYab, focusSpace, newPrivateWindow, newTab, openSmallWindow, readWindow, selectTab } from "./yab";

// Refreshes in the background never open Yab: closed, it lists nothing.
const quietWindow = () => readWindow({ launch: false });
const quietSessions = () => listSessions({ launch: false });

function short(text: string, max = 42): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export default function Command() {
  const { data: window, isLoading: a } = useCachedPromise(quietWindow, [], { keepPreviousData: true });
  const { data: rows, isLoading: b } = useCachedPromise(quietSessions, [], { keepPreviousData: true });
  const onScreen = window?.spaces.find((s) => s.active);
  const pins = (window?.tabs ?? []).filter((t) => t.location === "topApp" && t.spaceId === onScreen?.id);
  const waiting = (rows ?? []).filter((r) => groupOf(r) === "waiting");
  const working = (rows ?? []).filter((r) => groupOf(r) === "working");

  return (
    <MenuBarExtra
      icon={{ source: "icon.png", mask: Image.Mask.RoundedRectangle }}
      title={waiting.length ? `${waiting.length} waiting` : undefined}
      tooltip="Yab"
      isLoading={a || b}
    >
      {waiting.length || working.length ? (
        <MenuBarExtra.Section title="Agents">
          {[...waiting, ...working].map((r) => (
            <MenuBarExtra.Item
              key={r.id}
              icon={groupOf(r) === "waiting" ? Icon.Person : Icon.CircleProgress50}
              title={short(r.title || r.prompt || r.id)}
              subtitle={groupOf(r) === "waiting" ? "needs you" : "working"}
              onAction={() => launchCommand({ name: "agent-sessions", type: LaunchType.UserInitiated })}
            />
          ))}
        </MenuBarExtra.Section>
      ) : null}
      {window ? (
        <MenuBarExtra.Section title="Spaces">
          {window.spaces.slice(0, 9).map((s, i) => (
            <MenuBarExtra.Item
              key={s.id}
              title={spaceLabel(s)}
              subtitle={s.active ? "on screen" : undefined}
              shortcut={{ modifiers: ["ctrl"], key: String(i + 1) as "1" }}
              onAction={() => focusSpace(s.id)}
            />
          ))}
        </MenuBarExtra.Section>
      ) : (
        <MenuBarExtra.Item title="Open Yab" icon={Icon.AppWindow} onAction={() => activateYab()} />
      )}
      {pins.length ? (
        <MenuBarExtra.Section title={`Pins in ${onScreen?.title ?? "this space"}`}>
          {pins.slice(0, 9).map((t, i) => (
            <MenuBarExtra.Item
              key={t.id}
              icon={favicon(t.url)}
              title={short(t.title)}
              shortcut={{ modifiers: ["cmd"], key: String(i + 1) as "1" }}
              onAction={() => selectTab(t.id)}
            />
          ))}
        </MenuBarExtra.Section>
      ) : null}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="New Tab"
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "t" }}
          onAction={() => newTab("")}
        />
        <MenuBarExtra.Item
          title="New Private Window"
          icon={Icon.EyeDisabled}
          shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
          onAction={() => newPrivateWindow()}
        />
        <MenuBarExtra.Item
          title="Small Window"
          icon={Icon.AppWindow}
          shortcut={{ modifiers: ["cmd", "opt"], key: "n" }}
          onAction={() => openSmallWindow()}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Search Tabs…"
          onAction={() => launchCommand({ name: "search-tabs", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Search History…"
          shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
          onAction={() => launchCommand({ name: "search-history", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
