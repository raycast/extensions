# Tunnel List Keyboard Interaction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `Space` toggle the selected SSH tunnel and make `Enter` open a submenu of tunnel actions in the Raycast list.

**Architecture:** Extract the row action UI into a focused `src/tunnel-row-actions.tsx` component so the keyboard mapping can be tested without touching tunnel process logic. Keep `src/manage-tunnels.tsx` responsible for data loading and callbacks, while the new component owns the action ordering, submenu layout, and shortcuts.

**Tech Stack:** Raycast API, React/TSX, Bun test, TypeScript

---

### Task 1: Extract a tested tunnel row action panel

**Files:**
- Create: `tests/tunnel-row-actions.test.tsx`
- Create: `src/tunnel-row-actions.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/tunnel-row-actions.test.tsx` with this content:

```tsx
import { describe, expect, test } from "bun:test";
import { Action, ActionPanel } from "@raycast/api";
import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import TunnelRowActions from "../src/tunnel-row-actions";
import type { Status } from "../src/lib/process";
import type { Tunnel } from "../src/lib/store";

type Row = {
  tunnel: Tunnel;
  status: Status;
  uptime?: string;
  pid?: number;
};

const baseTunnel: Tunnel = {
  id: "test-tunnel",
  name: "Test Tunnel",
  localPort: 5433,
  remoteHost: "localhost",
  remotePort: 5432,
  sshTarget: "user@example.com",
};

function buildRow(status: Status): Row {
  return { tunnel: baseTunnel, status };
}

function getChildren(node: ReactNode) {
  return Children.toArray(node).filter(isValidElement) as ReactElement[];
}

function renderPanel(status: Status = "stopped") {
  return TunnelRowActions({
    row: buildRow(status),
    addTunnelAction: (
      <Action
        title="Add Tunnel"
        shortcut={{ modifiers: ["cmd"], key: "n" }}
        onAction={() => undefined}
      />
    ),
    onToggle: () => undefined,
    onRestart: () => undefined,
    onShowLogs: () => undefined,
    onEdit: () => undefined,
    onDelete: () => undefined,
  }) as ReactElement;
}

describe("TunnelRowActions", () => {
  test("uses a submenu as the primary action and assigns Space to tunnel toggle", () => {
    const panel = renderPanel("stopped");
    const topLevelChildren = getChildren(panel.props.children);

    expect(topLevelChildren[0].type).toBe(ActionPanel.Submenu);
    expect(topLevelChildren[0].props.title).toBe("Tunnel Actions");

    const submenuChildren = getChildren(topLevelChildren[0].props.children);
    expect(submenuChildren[0].props.title).toBe("Start Tunnel");
    expect(submenuChildren[0].props.shortcut).toEqual({ modifiers: [], key: "space" });

    expect(topLevelChildren[1].props.title).toBe("Add Tunnel");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
bun test tests/tunnel-row-actions.test.tsx
```

Expected: FAIL with a module resolution error for `../src/tunnel-row-actions` because the component does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `src/tunnel-row-actions.tsx` with this content:

```tsx
import { Action, ActionPanel, Icon } from "@raycast/api";
import type { ReactElement } from "react";
import type { Status } from "./lib/process";
import type { Tunnel } from "./lib/store";

export type TunnelRow = {
  tunnel: Tunnel;
  status: Status;
  uptime?: string;
  pid?: number;
};

type Props = {
  row: TunnelRow;
  addTunnelAction: ReactElement;
  onToggle: () => void;
  onRestart: () => void;
  onShowLogs: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export default function TunnelRowActions({ row, addTunnelAction, onToggle }: Props) {
  const running = row.status === "running";

  return (
    <ActionPanel>
      <ActionPanel.Submenu title="Tunnel Actions" icon={Icon.List}>
        <Action
          title={running ? "Stop Tunnel" : "Start Tunnel"}
          icon={running ? Icon.Stop : Icon.Play}
          shortcut={{ modifiers: [], key: "space" }}
          onAction={onToggle}
        />
      </ActionPanel.Submenu>
      {addTunnelAction}
    </ActionPanel>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
bun test tests/tunnel-row-actions.test.tsx
```

Expected: PASS with `1 pass` and `0 fail`.

- [ ] **Step 5: Commit**

Run:

```bash
git add tests/tunnel-row-actions.test.tsx src/tunnel-row-actions.tsx
git commit -m "feat(tunnels): extract row action panel"
```

Expected: a successful commit containing the new test and new component.

### Task 2: Fill out submenu actions and wire the list view to the new component

**Files:**
- Modify: `tests/tunnel-row-actions.test.tsx`
- Modify: `src/tunnel-row-actions.tsx`
- Modify: `src/manage-tunnels.tsx`

- [ ] **Step 1: Write the failing test**

Replace `tests/tunnel-row-actions.test.tsx` with this expanded version:

```tsx
import { describe, expect, test } from "bun:test";
import { Action, ActionPanel } from "@raycast/api";
import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import TunnelRowActions from "../src/tunnel-row-actions";
import type { Status } from "../src/lib/process";
import type { Tunnel } from "../src/lib/store";

type Row = {
  tunnel: Tunnel;
  status: Status;
  uptime?: string;
  pid?: number;
};

const baseTunnel: Tunnel = {
  id: "test-tunnel",
  name: "Test Tunnel",
  localPort: 5433,
  remoteHost: "localhost",
  remotePort: 5432,
  sshTarget: "user@example.com",
};

function buildRow(status: Status): Row {
  return { tunnel: baseTunnel, status };
}

function getChildren(node: ReactNode) {
  return Children.toArray(node).filter(isValidElement) as ReactElement[];
}

function renderPanel(status: Status = "stopped") {
  return TunnelRowActions({
    row: buildRow(status),
    addTunnelAction: (
      <Action
        title="Add Tunnel"
        shortcut={{ modifiers: ["cmd"], key: "n" }}
        onAction={() => undefined}
      />
    ),
    onToggle: () => undefined,
    onRestart: () => undefined,
    onShowLogs: () => undefined,
    onEdit: () => undefined,
    onDelete: () => undefined,
  }) as ReactElement;
}

describe("TunnelRowActions", () => {
  test("uses a submenu as the primary action and assigns Space to tunnel toggle", () => {
    const panel = renderPanel("stopped");
    const topLevelChildren = getChildren(panel.props.children);

    expect(topLevelChildren[0].type).toBe(ActionPanel.Submenu);
    expect(topLevelChildren[0].props.title).toBe("Tunnel Actions");

    const submenuChildren = getChildren(topLevelChildren[0].props.children);
    expect(submenuChildren[0].props.title).toBe("Start Tunnel");
    expect(submenuChildren[0].props.shortcut).toEqual({ modifiers: [], key: "space" });

    expect(topLevelChildren[1].props.title).toBe("Add Tunnel");
  });

  test("keeps the remaining tunnel actions inside the submenu with their existing shortcuts", () => {
    const panel = renderPanel("running");
    const topLevelChildren = getChildren(panel.props.children);
    const submenuChildren = getChildren(topLevelChildren[0].props.children);

    expect(submenuChildren.map((child) => child.props.title)).toEqual([
      "Stop Tunnel",
      "Restart Tunnel",
      "Copy Local Address",
      "Show Logs",
      "Edit Tunnel",
      "Delete Tunnel",
    ]);

    expect(submenuChildren[1].props.shortcut).toEqual({ modifiers: ["cmd"], key: "r" });
    expect(submenuChildren[2].props.shortcut).toEqual({ modifiers: ["cmd"], key: "." });
    expect(submenuChildren[3].props.shortcut).toEqual({ modifiers: ["cmd"], key: "l" });
    expect(submenuChildren[4].props.shortcut).toEqual({ modifiers: ["cmd"], key: "e" });
    expect(submenuChildren[5].props.shortcut).toEqual({ modifiers: ["ctrl"], key: "x" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
bun test tests/tunnel-row-actions.test.tsx
```

Expected: FAIL because the current component only renders the toggle action and does not yet include restart, copy, logs, edit, or delete.

- [ ] **Step 3: Expand the row action component**

Replace `src/tunnel-row-actions.tsx` with this full implementation:

```tsx
import { Action, ActionPanel, Icon } from "@raycast/api";
import type { ReactElement } from "react";
import type { Status } from "./lib/process";
import type { Tunnel } from "./lib/store";

export type TunnelRow = {
  tunnel: Tunnel;
  status: Status;
  uptime?: string;
  pid?: number;
};

type Props = {
  row: TunnelRow;
  addTunnelAction: ReactElement;
  onToggle: () => void;
  onRestart: () => void;
  onShowLogs: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export default function TunnelRowActions({
  row,
  addTunnelAction,
  onToggle,
  onRestart,
  onShowLogs,
  onEdit,
  onDelete,
}: Props) {
  const running = row.status === "running";

  return (
    <ActionPanel>
      <ActionPanel.Submenu title="Tunnel Actions" icon={Icon.List}>
        <Action
          title={running ? "Stop Tunnel" : "Start Tunnel"}
          icon={running ? Icon.Stop : Icon.Play}
          shortcut={{ modifiers: [], key: "space" }}
          onAction={onToggle}
        />
        <Action
          title="Restart Tunnel"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={onRestart}
        />
        <Action.CopyToClipboard
          title="Copy Local Address"
          content={`localhost:${row.tunnel.localPort}`}
          shortcut={{ modifiers: ["cmd"], key: "." }}
        />
        <Action
          title="Show Logs"
          icon={Icon.Text}
          shortcut={{ modifiers: ["cmd"], key: "l" }}
          onAction={onShowLogs}
        />
        <Action
          title="Edit Tunnel"
          icon={Icon.Pencil}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          onAction={onEdit}
        />
        <Action
          title="Delete Tunnel"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={onDelete}
        />
      </ActionPanel.Submenu>
      {addTunnelAction}
    </ActionPanel>
  );
}
```

- [ ] **Step 4: Wire `ManageTunnels` to the component**

In `src/manage-tunnels.tsx`, add the import:

```tsx
import TunnelRowActions from "./tunnel-row-actions";
```

Then replace the current `actions={...}` block inside `List.Item` with this:

```tsx
actions={
  <TunnelRowActions
    row={row}
    addTunnelAction={newTunnelAction}
    onToggle={() => toggle(row)}
    onRestart={() => restart(row)}
    onShowLogs={() => push(<TunnelLogs tunnel={row.tunnel} />)}
    onEdit={() =>
      push(<TunnelForm tunnel={row.tunnel} onSave={revalidate} />)
    }
    onDelete={() => remove(row)}
  />
}
```

After the replacement, the relevant section of `src/manage-tunnels.tsx` should read like this:

```tsx
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect } from "react";
import { Tunnel, loadTunnels, removeTunnel } from "./lib/store";
import {
  Status,
  forwardSpec,
  getPid,
  getStatus,
  restartTunnel,
  startTunnel,
  stopTunnel,
  uptime,
} from "./lib/process";
import TunnelForm from "./tunnel-form";
import TunnelLogs from "./tunnel-logs";
import TunnelRowActions from "./tunnel-row-actions";

type Row = { tunnel: Tunnel; status: Status; uptime?: string; pid?: number };

export default function ManageTunnels() {
  const { push } = useNavigation();

  const { data, isLoading, revalidate } = usePromise(
    async (): Promise<Row[]> => {
      return loadTunnels().map((tunnel) => ({
        tunnel,
        status: getStatus(tunnel),
        uptime: uptime(tunnel),
        pid: getPid(tunnel),
      }));
    },
  );

  useEffect(() => {
    const timer = setInterval(revalidate, 3000);
    return () => clearInterval(timer);
  }, [revalidate]);

  async function toggle(row: Row) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title:
        row.status === "running" ? "Menghentikan tunnel" : "Menjalankan tunnel",
    });
    try {
      if (row.status === "running") {
        await stopTunnel(row.tunnel);
        toast.style = Toast.Style.Success;
        toast.title = `${row.tunnel.name} berhenti`;
      } else {
        await startTunnel(row.tunnel);
        toast.style = Toast.Style.Success;
        toast.title = `${row.tunnel.name} berjalan`;
        toast.message = `localhost:${row.tunnel.localPort}`;
      }
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Tunnel gagal berjalan";
      toast.message = err instanceof Error ? err.message : String(err);
    }
    revalidate();
  }

  async function restart(row: Row) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Menjalankan ulang",
    });
    try {
      await restartTunnel(row.tunnel);
      toast.style = Toast.Style.Success;
      toast.title = `${row.tunnel.name} berjalan`;
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Tunnel gagal berjalan";
      toast.message = err instanceof Error ? err.message : String(err);
    }
    revalidate();
  }

  async function remove(row: Row) {
    const confirmed = await confirmAlert({
      title: `Hapus "${row.tunnel.name}"?`,
      message:
        row.status === "running"
          ? "Tunnel sedang berjalan dan akan dihentikan lebih dulu."
          : undefined,
      primaryAction: { title: "Hapus", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    if (row.status === "running") await stopTunnel(row.tunnel);
    removeTunnel(row.tunnel.id);
    await showToast({
      style: Toast.Style.Success,
      title: `${row.tunnel.name} dihapus`,
    });
    revalidate();
  }

  const newTunnelAction = (
    <Action
      title="Add Tunnel"
      icon={Icon.Plus}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      onAction={() => push(<TunnelForm onSave={revalidate} />)}
    />
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Cari tunnel">
      <List.EmptyView
        icon={Icon.Network}
        title="Belum ada tunnel"
        description="Tambahkan tunnel pertama untuk meneruskan port dari server ke mesin ini."
        actions={<ActionPanel>{newTunnelAction}</ActionPanel>}
      />

      {(data ?? []).map((row) => {
        const running = row.status === "running";
        return (
          <List.Item
            key={row.tunnel.id}
            icon={{
              source: running ? Icon.CircleFilled : Icon.Circle,
              tintColor: running ? Color.Green : Color.SecondaryText,
            }}
            title={row.tunnel.name}
            subtitle={`${forwardSpec(row.tunnel)} → ${row.tunnel.sshTarget}`}
            accessories={[
              row.tunnel.autoReconnect
                ? { tag: { value: "auto", color: Color.Purple } }
                : {},
              row.tunnel.compression
                ? { tag: { value: "compressed", color: Color.Blue } }
                : {},
              row.uptime
                ? { tag: { value: row.uptime, color: Color.Green } }
                : {},
              { text: running ? `PID ${row.pid}` : "berhenti" },
            ]}
            actions={
              <TunnelRowActions
                row={row}
                addTunnelAction={newTunnelAction}
                onToggle={() => toggle(row)}
                onRestart={() => restart(row)}
                onShowLogs={() => push(<TunnelLogs tunnel={row.tunnel} />)}
                onEdit={() =>
                  push(<TunnelForm tunnel={row.tunnel} onSave={revalidate} />)
                }
                onDelete={() => remove(row)}
              />
            }
          />
        );
      })}
    </List>
  );
}
```

- [ ] **Step 5: Run tests and lint to verify the integration**

Run:

```bash
bun test tests/tunnel-row-actions.test.tsx
bun test
bun run lint
```

Expected:
- `bun test tests/tunnel-row-actions.test.tsx` passes with `2 pass`
- `bun test` passes all test files
- `bun run lint` exits successfully with no TypeScript or Raycast lint errors

- [ ] **Step 6: Commit**

Run:

```bash
git add tests/tunnel-row-actions.test.tsx src/tunnel-row-actions.tsx src/manage-tunnels.tsx
git commit -m "feat(tunnels): remap tunnel keyboard actions"
```

Expected: a successful commit containing the completed keyboard interaction change.

### Task 3: Manual Raycast verification

**Files:**
- No file changes

- [ ] **Step 1: Launch the extension in Raycast dev mode**

Run:

```bash
bun run dev
```

Expected: Raycast development mode starts and the extension reloads with the updated command.

- [ ] **Step 2: Verify the new keyboard flow manually**

Manual checklist in Raycast:

```text
1. Open “Manage SSH Tunnels”.
2. Select a stopped tunnel and press Space.
3. Confirm the tunnel starts and a success toast appears.
4. Press Space again on the same tunnel.
5. Confirm the tunnel stops and a success toast appears.
6. Press Enter on any tunnel row.
7. Confirm a submenu titled “Tunnel Actions” opens instead of toggling immediately.
8. Confirm Restart Tunnel, Copy Local Address, Show Logs, Edit Tunnel, and Delete Tunnel are visible there.
9. Press Cmd+E and Cmd+L on a selected tunnel to confirm power-user shortcuts still work.
```

Expected: every item in the checklist succeeds without changing tunnel process behavior.

- [ ] **Step 3: Record final status**

Run:

```bash
git status --short
```

Expected: clean working tree if the commits above were created, or only intentional changes if the work is not committed yet.
