import { Color, Icon, launchCommand, LaunchType, MenuBarExtra, updateCommandMetadata } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { homedir } from "node:os";
import { useMemo } from "react";
import {
  loadWorkspace,
  OttyNotRunningError,
  openNewWindow,
  runOtty,
  sectionsFor,
  showFailure,
  type Workspace,
} from "./lib/otty";
import { abbreviateHome } from "./lib/paths";
import { statusIcon } from "./lib/ui";
import { agentStatus, menuLabel, type AgentState, type Row } from "./lib/workspace";

const MENU_BAR_ICON = "menu-bar-icon.png";
const GROUPS: AgentState[] = ["awaiting", "processing", "unknown"];

function agentRows(workspace: Workspace): Row[] {
  return sectionsFor("panes", workspace)
    .flatMap((section) => section.rows)
    .filter((row) => row.agent);
}

function needInputSubtitle(count: number): string {
  return count === 0 ? "" : `${count} need${count === 1 ? "s" : ""} input`;
}

export default function Command() {
  const { data, isLoading, error } = useCachedPromise(loadWorkspace, [], {
    keepPreviousData: true,
    // The menu itself shows failures; a background refresh must never toast,
    // but it must not leave an old "needs input" subtitle behind either.
    onError: () => updateCommandMetadata({ subtitle: "" }),
    onData: (workspace) => {
      const awaiting = agentRows(workspace).filter((row) => row.agentState === "awaiting").length;
      updateCommandMetadata({ subtitle: needInputSubtitle(awaiting) });
    },
  });

  const rows = useMemo(() => (data && !error ? agentRows(data) : []), [data, error]);
  const awaiting = rows.filter((row) => row.agentState === "awaiting");
  const idle = rows.filter((row) => row.agentState === "idle");

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={{
        source: MENU_BAR_ICON,
        tintColor: awaiting.length > 0 ? Color.Orange : Color.PrimaryText,
      }}
      title={awaiting.length > 0 ? String(awaiting.length) : undefined}
      tooltip={awaiting.length > 0 ? `Otty: ${needInputSubtitle(awaiting.length)}` : "Otty Agents"}
    >
      {error instanceof OttyNotRunningError ? (
        <MenuBarExtra.Item title="Otty Isn't Running" icon={Icon.Terminal} onAction={openNewWindow} />
      ) : error ? (
        <MenuBarExtra.Item
          title="Could Not Read Otty"
          icon={Icon.Warning}
          onAction={() => showFailure("Could not read Otty", error)}
        />
      ) : null}

      {GROUPS.map((state) => {
        const group = rows.filter((row) => row.agentState === state);
        return group.length > 0 ? (
          <MenuBarExtra.Section key={state} title={agentStatus(state)?.label}>
            {group.map((row) => (
              <AgentItem key={row.id} row={row} />
            ))}
          </MenuBarExtra.Section>
        ) : null;
      })}

      {idle.length > 0 ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Submenu
            title={`${agentStatus("idle")?.label} (${idle.length})`}
            icon={statusIcon("", "idle", Icon.Terminal).value}
          >
            {idle.map((row) => (
              <AgentItem key={row.id} row={row} />
            ))}
          </MenuBarExtra.Submenu>
        </MenuBarExtra.Section>
      ) : null}

      {!error && rows.length === 0 && !isLoading ? <MenuBarExtra.Item title="No Agents Running" /> : null}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Search Otty Tabs…" icon={Icon.MagnifyingGlass} onAction={openSearchTabs} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

function AgentItem({ row }: { row: Row }) {
  const icon = statusIcon(row.agent, row.agentState, Icon.Terminal);
  const label = menuLabel(row);
  return (
    <MenuBarExtra.Item
      title={label.title}
      subtitle={label.subtitle}
      icon={icon.value}
      tooltip={[row.title, row.cwd && abbreviateHome(row.cwd, homedir()), icon.tooltip].filter(Boolean).join("\n")}
      onAction={async () => {
        try {
          await runOtty(row.focusArgs);
        } catch (error) {
          await showFailure(`Could not switch to ${row.title}`, error);
        }
      }}
    />
  );
}

async function openSearchTabs() {
  try {
    await launchCommand({
      name: "search-tabs",
      type: LaunchType.UserInitiated,
    });
  } catch (error) {
    await showFailure("Could not open Search Otty Tabs", error);
  }
}
