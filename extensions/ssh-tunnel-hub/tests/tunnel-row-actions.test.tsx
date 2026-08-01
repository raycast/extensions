import { describe, expect, mock, test } from "bun:test";
import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import type { Status } from "../src/lib/process";
import type { Tunnel } from "../src/lib/store";

function createComponent(name: string) {
  function Component() {
    return null;
  }

  Component.displayName = name;
  return Component;
}

const MockAction = Object.assign(createComponent("Action"), {
  CopyToClipboard: createComponent("Action.CopyToClipboard"),
  Style: {
    Destructive: "destructive",
  },
});

const MockActionPanel = Object.assign(createComponent("ActionPanel"), {
  Submenu: createComponent("ActionPanel.Submenu"),
  Section: createComponent("ActionPanel.Section"),
});

const MockIcon = new Proxy(
  {},
  {
    get: (_, prop) => String(prop),
  },
);

mock.module("@raycast/api", () => ({
  Action: MockAction,
  ActionPanel: MockActionPanel,
  Icon: MockIcon,
}));

const { Action, ActionPanel } = await import("@raycast/api");
const { default: TunnelRowActions } = await import("../src/tunnel-row-actions");

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
