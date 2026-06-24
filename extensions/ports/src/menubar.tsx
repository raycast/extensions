import {
  Color,
  Icon,
  MenuBarExtra,
  openExtensionPreferences,
  showHUD,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  caffeinate,
  findSessions,
  rowLabel,
  uncaffeinate,
  type AgentSession,
  type PortRow,
} from "./ports";

function providerIcon(provider: string): Icon {
  const tag = provider.toLowerCase();
  if (tag.includes("claude")) return Icon.Stars;
  if (tag.includes("codex")) return Icon.Code;
  if (tag.includes("gemini")) return Icon.Wand;
  if (tag.includes("cursor")) return Icon.TextCursor;
  return Icon.Terminal;
}

function workspaceTail(s: AgentSession): string {
  return (s.workspaceLabel || "—").split("/").slice(-2).join("/");
}

function statusFragment(s: AgentSession): string {
  if (s.allCaffeinated) return "awake";
  if (s.anyCaffeinated)
    return `${s.caffeinatedPids.length}/${s.pids.length} awake`;
  return "idle";
}

function singleItemSubtitle(s: AgentSession): string {
  const r = s.rows[0];
  return `${statusFragment(s)} · pid ${r.pid}${r.age ? ` · ${r.age}` : ""}`;
}

function submenuTitle(s: AgentSession): string {
  return `${s.provider} — ${workspaceTail(s)} · ${statusFragment(s)} · ${s.pids.length} procs`;
}

async function forEachPid(pids: number[], fn: (pid: number) => Promise<void>) {
  for (const pid of pids) {
    try {
      await fn(pid);
    } catch {
      /* keep going */
    }
  }
}

export default function Command() {
  const { data, isLoading, revalidate, error } = useCachedPromise(
    findSessions,
    [],
    {
      initialData: [] as AgentSession[],
    },
  );

  const sessions = data ?? [];
  const litCount = sessions.filter((s) => s.anyCaffeinated).length;

  const icon =
    litCount > 0
      ? { source: Icon.Bolt, tintColor: Color.Yellow }
      : { source: Icon.BoltDisabled, tintColor: Color.SecondaryText };

  const title = sessions.length === 0 ? "" : `${litCount}/${sessions.length}`;

  const tooltip = error
    ? `ports CLI error — check Preferences`
    : litCount === 0
      ? `No AI sessions caffeinated (${sessions.length} detected)`
      : `${litCount} of ${sessions.length} AI sessions kept awake`;

  const togglePid = async (r: PortRow) => {
    try {
      if (r.caffeinated) {
        await uncaffeinate(r.pid);
        await showHUD(`Released pid ${r.pid}`);
      } else {
        await caffeinate(r.pid);
        await showHUD(`Caffeinated pid ${r.pid}`);
      }
      revalidate();
    } catch (e) {
      await showHUD(`Failed: ${(e as Error).message}`);
    }
  };

  const toggleSession = async (s: AgentSession) => {
    try {
      if (s.anyCaffeinated) {
        await forEachPid(s.caffeinatedPids, uncaffeinate);
        await showHUD(`Released ${s.provider} — ${workspaceTail(s)}`);
      } else {
        await forEachPid(s.pids, caffeinate);
        await showHUD(`Caffeinated ${s.provider} — ${workspaceTail(s)}`);
      }
      revalidate();
    } catch (e) {
      await showHUD(`Failed: ${(e as Error).message}`);
    }
  };

  const caffeinateAll = async () => {
    const need = sessions.flatMap((s) =>
      s.pids.filter((p) => !s.caffeinatedPids.includes(p)),
    );
    if (need.length === 0) {
      await showHUD("All sessions already caffeinated");
      return;
    }
    await forEachPid(need, caffeinate);
    await showHUD(
      `Caffeinated ${need.length} process${need.length === 1 ? "" : "es"}`,
    );
    revalidate();
  };

  const releaseAll = async () => {
    const on = sessions.flatMap((s) => s.caffeinatedPids);
    if (on.length === 0) {
      await showHUD("Nothing to release");
      return;
    }
    await forEachPid(on, uncaffeinate);
    await showHUD(
      `Released ${on.length} process${on.length === 1 ? "" : "es"}`,
    );
    revalidate();
  };

  return (
    <MenuBarExtra
      icon={icon}
      title={title}
      tooltip={tooltip}
      isLoading={isLoading}
    >
      <MenuBarExtra.Section title="AI Sessions">
        {sessions.length === 0 && !isLoading && (
          <MenuBarExtra.Item
            title={error ? "Error — see Preferences" : "No sessions detected"}
            icon={Icon.QuestionMark}
          />
        )}

        {sessions.map((s) =>
          s.rows.length === 1 ? (
            <MenuBarExtra.Item
              key={s.key}
              title={`${s.provider} — ${workspaceTail(s)}`}
              subtitle={singleItemSubtitle(s)}
              icon={{
                source: s.anyCaffeinated ? Icon.Bolt : providerIcon(s.provider),
                tintColor: s.anyCaffeinated
                  ? Color.Yellow
                  : Color.SecondaryText,
              }}
              tooltip={s.rows[0].fullCommand || s.workspace || undefined}
              onAction={() => toggleSession(s)}
            />
          ) : (
            <MenuBarExtra.Submenu
              key={s.key}
              title={submenuTitle(s)}
              icon={{
                source: s.anyCaffeinated ? Icon.Bolt : providerIcon(s.provider),
                tintColor: s.anyCaffeinated
                  ? Color.Yellow
                  : Color.SecondaryText,
              }}
            >
              {!s.allCaffeinated && (
                <MenuBarExtra.Item
                  title={
                    s.anyCaffeinated
                      ? `Caffeinate Session (${s.pids.length - s.caffeinatedPids.length} remaining)`
                      : "Caffeinate Session"
                  }
                  icon={{ source: Icon.Bolt, tintColor: Color.Yellow }}
                  onAction={async () => {
                    const off = s.pids.filter(
                      (p) => !s.caffeinatedPids.includes(p),
                    );
                    await forEachPid(off, caffeinate);
                    await showHUD(
                      `Caffeinated ${off.length} process${off.length === 1 ? "" : "es"}`,
                    );
                    revalidate();
                  }}
                />
              )}
              {s.anyCaffeinated && (
                <MenuBarExtra.Item
                  title={
                    s.allCaffeinated
                      ? "Release Session"
                      : `Release Session (${s.caffeinatedPids.length} awake)`
                  }
                  icon={Icon.BoltDisabled}
                  onAction={async () => {
                    await forEachPid(s.caffeinatedPids, uncaffeinate);
                    await showHUD(
                      `Released ${s.caffeinatedPids.length} process${s.caffeinatedPids.length === 1 ? "" : "es"}`,
                    );
                    revalidate();
                  }}
                />
              )}
              <MenuBarExtra.Section title={`${s.pids.length} processes`}>
                {s.rows.map((r) => (
                  <MenuBarExtra.Item
                    key={r.pid}
                    title={rowLabel(r)}
                    subtitle={r.caffeinated ? "awake" : "idle"}
                    icon={{
                      source: r.caffeinated ? Icon.Bolt : Icon.Circle,
                      tintColor: r.caffeinated
                        ? Color.Yellow
                        : Color.SecondaryText,
                    }}
                    tooltip={r.fullCommand}
                    onAction={() => togglePid(r)}
                  />
                ))}
              </MenuBarExtra.Section>
            </MenuBarExtra.Submenu>
          ),
        )}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Caffeinate All"
          icon={{ source: Icon.Bolt, tintColor: Color.Yellow }}
          onAction={caffeinateAll}
          shortcut={{ modifiers: ["cmd"], key: "k" }}
        />
        <MenuBarExtra.Item
          title="Release All"
          icon={Icon.BoltDisabled}
          onAction={releaseAll}
          shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
        />
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          onAction={revalidate}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Preferences…"
          icon={Icon.Gear}
          onAction={openExtensionPreferences}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
