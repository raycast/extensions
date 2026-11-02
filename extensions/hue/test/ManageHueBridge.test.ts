import { describe, expect, it, vi } from "vitest";
import type { JSX } from "react";
import ManageHueBridge from "../src/components/ManageHueBridge";
import UnlinkAction from "../src/components/UnlinkAction";
import type { HueBridgeState } from "../src/lib/hueBridgeMachine";
import { ActionPanel, Detail, openExtensionPreferences, preferences } from "./raycast-stub";

function render(value: HueBridgeState["value"]) {
  const send = vi.fn();
  const element = ManageHueBridge({ value } as HueBridgeState, send);
  const actions: JSX.Element[] = element?.props.actions.props.children ?? [];
  return { element, send, actions };
}

const title = (action: JSX.Element): string => (action.type === UnlinkAction ? "Unlink" : action.props.title);
const findAction = (actions: JSX.Element[], name: string) => actions.find((action) => title(action) === name)!;

describe("ManageHueBridge", () => {
  it.each(["loadingPreferences", "loadingConfiguration", "connecting", "connected", "unlinking"] as const)(
    "shows no screen while %s",
    (state) => {
      expect(render(state).element).toBeNull();
    },
  );

  it.each<[HueBridgeState["value"], string[]]>([
    ["failedToLoadPreferences", ["Open Extension Preferences", "Unlink"]],
    ["unauthorized", ["Link Again", "Unlink"]],
    ["failedToConnect", ["Retry", "Open Extension Preferences", "Unlink"]],
    [{ discovering: "usingMdns" }, []],
    ["noBridgeFound", ["Retry", "Open Extension Preferences"]],
    ["waitingForLinkButton", []],
    ["failedToLink", ["Retry", "Open Extension Preferences"]],
    ["linked", ["Done", "Unlink"]],
  ])("%s offers %j", (state, titles) => {
    const { element, actions } = render(state);
    expect(element?.type).toBe(Detail);
    expect(element?.props.actions.type).toBe(ActionPanel);
    expect(actions.map(title)).toEqual(titles);
  });

  it("unauthorized points to a username preference instead of linking again", () => {
    preferences.bridgeUsername = "rejected";
    expect(render("unauthorized").actions.map(title)).toEqual(["Open Extension Preferences", "Unlink"]);
  });

  it.each<[string, HueBridgeState["value"], string]>([
    ["Retry", "failedToConnect", "RETRY"],
    ["Retry", "noBridgeFound", "RETRY"],
    ["Retry", "failedToLink", "RETRY"],
    ["Link Again", "unauthorized", "LINK"],
    ["Done", "linked", "DONE"],
  ])("%s in %s sends %s", (name, state, type) => {
    const { actions, send } = render(state);
    findAction(actions, name).props.onAction();
    expect(send).toHaveBeenCalledWith({ type });
  });

  it("Open Extension Preferences opens them", () => {
    const { actions, send } = render("failedToConnect");
    findAction(actions, "Open Extension Preferences").props.onAction();
    expect(openExtensionPreferences).toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it.each(["failedToConnect", "failedToLink"] as const)(
    "%s names the IP address preference only when it's set",
    (state) => {
      expect(render(state).element?.props.markdown).not.toMatch(/IP address/);
      preferences.bridgeIpAddress = "192.0.2.10";
      expect(render(state).element?.props.markdown).toContain("192.0.2.10");
    },
  );
});
