import { Icon, LaunchType, MenuBarExtra, launchCommand, showHUD } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  ServiceState,
  WorkspaceInfo,
  aerospace,
  errorMessage,
  getServiceSummary,
  listWorkspaces,
  reloadAerospace,
  toggleAerospace,
} from "./utils/aerospace";
import { coloredIcon, PALETTE } from "./utils/theme";

type MenuData = {
  state: ServiceState;
  label: string;
  workspaces: WorkspaceInfo[];
};

async function loadMenu(): Promise<MenuData> {
  const summary = await getServiceSummary();
  let workspaces: WorkspaceInfo[] = [];
  if (summary.state === "enabled") {
    workspaces = await listWorkspaces().catch(() => []);
  }
  return { ...summary, workspaces };
}

async function execute(task: () => Promise<{ stdout: string; stderr: string }>) {
  try {
    const result = await task();
    await showHUD(result.stdout || result.stderr || "Done");
  } catch (error) {
    await showHUD(`AeroSpace error: ${errorMessage(error)}`);
  }
}

export default function Command() {
  const { data, isLoading, revalidate } = usePromise(loadMenu);
  const state = data?.state ?? "stopped";
  const icon = coloredIcon(
    state === "enabled" ? Icon.CircleFilled : state === "disabled" ? Icon.Pause : Icon.Circle,
    state === "enabled" ? PALETTE.green : state === "disabled" ? PALETTE.amber : PALETTE.secondary,
  );

  return (
    <MenuBarExtra icon={icon} isLoading={isLoading} tooltip={data?.label || "AeroSpace Status"}>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title={data?.label || "Detecting AeroSpace…"} />
      </MenuBarExtra.Section>
      {data?.workspaces.length ? (
        <MenuBarExtra.Section title="Workspaces">
          {data.workspaces.map((workspace) => (
            <MenuBarExtra.Item
              key={`${workspace["monitor-id"]}-${workspace.workspace}`}
              icon={coloredIcon(
                workspace["workspace-is-focused"] ? Icon.CheckCircle : Icon.Window,
                workspace["workspace-is-focused"] ? PALETTE.green : PALETTE.indigo,
              )}
              title={`Workspace ${workspace.workspace}`}
              subtitle={workspace["monitor-name"]}
              onAction={() => execute(() => aerospace(["workspace", workspace.workspace]))}
            />
          ))}
        </MenuBarExtra.Section>
      ) : null}
      <MenuBarExtra.Section title="Quick Controls">
        <MenuBarExtra.Item
          icon={coloredIcon(
            state === "enabled" ? Icon.Pause : Icon.Play,
            state === "enabled" ? PALETTE.amber : PALETTE.green,
          )}
          title={
            state === "enabled" ? "Pause AeroSpace" : state === "disabled" ? "Resume AeroSpace" : "Start AeroSpace"
          }
          onAction={async () => {
            await execute(toggleAerospace);
            revalidate();
          }}
        />
        <MenuBarExtra.Item
          icon={coloredIcon(Icon.AppWindow, PALETTE.indigo)}
          title="Toggle Focused Window Floating / Tiling"
          onAction={() => execute(() => aerospace(["layout", "floating", "tiling"]))}
        />
        <MenuBarExtra.Item
          icon={coloredIcon(Icon.RotateClockwise, PALETTE.blue)}
          title="Reload Configuration"
          onAction={() => execute(reloadAerospace)}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={coloredIcon(Icon.AppWindowGrid3x3, PALETTE.teal)}
          title="Open Control Center"
          onAction={() =>
            launchCommand({
              name: "control-center",
              type: LaunchType.UserInitiated,
            })
          }
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
