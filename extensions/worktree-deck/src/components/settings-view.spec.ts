import { Action, ActionPanel, Icon, List } from "@raycast/api";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";

import { RepositoryMappingManager } from "./repository-mapping-manager";
import { buildSettingsItems, GeneralSettingsForm, resolveGeneralSettingsIdeApp, SettingsView } from "./settings-view";

type ElementWithProps<Props> = ReactElement<Props>;

describe("buildSettingsItems", () => {
  it("General Settings と Repositories を含める", () => {
    expect(buildSettingsItems()).toEqual([
      {
        id: "general",
        title: "General Settings",
        subtitle: "Choose the IDE used to open workspaces and files.",
        icon: Icon.Gear,
      },
      {
        id: "repositories",
        title: "Repositories",
        subtitle: "Register repository roots and display names.",
        icon: Icon.Folder,
      },
    ]);
  });
});

describe("SettingsView", () => {
  it("General Settings から IDE 設定フォームへ遷移する", () => {
    const view = SettingsView({}) as ElementWithProps<{
      children: ReactElement;
      searchBarPlaceholder: string;
    }>;
    const section = view.props.children as ElementWithProps<{ children: ReactElement[]; title: string }>;
    const item = section.props.children[0] as ElementWithProps<{
      actions: ReactElement;
      title: string;
      subtitle: string;
    }>;
    const actions = item.props.actions as ElementWithProps<{ children: ReactElement[] }>;
    const pushAction = actions.props.children[0] as ElementWithProps<{
      target: ReactElement;
      title: string;
    }>;

    expect(item.props.title).toBe("General Settings");
    expect(pushAction.type).toBe(Action.Push);
    expect(pushAction.props.title).toBe("Open General Settings");
    expect(pushAction.props.target.type).toBe(GeneralSettingsForm);
  });

  it("Repositories から repository mapping 管理画面へ遷移する", () => {
    const handleRepositoryMappingChange = () => undefined;
    const view = SettingsView({ onRepositoryMappingChange: handleRepositoryMappingChange }) as ElementWithProps<{
      children: ReactElement;
      searchBarPlaceholder: string;
    }>;
    const section = view.props.children as ElementWithProps<{ children: ReactElement[]; title: string }>;
    const item = section.props.children[1] as ElementWithProps<{
      actions: ReactElement;
      title: string;
      subtitle: string;
    }>;
    const actions = item.props.actions as ElementWithProps<{ children: ReactElement[] }>;
    const pushAction = actions.props.children[1] as ElementWithProps<{
      target: ReactElement<{ onChange?: () => void }>;
      title: string;
    }>;

    expect(view.type).toBe(List);
    expect(view.props.searchBarPlaceholder).toBe("Search settings");
    expect(section.type).toBe(List.Section);
    expect(section.props.title).toBe("General");
    expect(item.type).toBe(List.Item);
    expect(item.props.title).toBe("Repositories");
    expect(item.props.subtitle).toBe("Register repository roots and display names.");
    expect(actions.type).toBe(ActionPanel);
    expect(pushAction.type).toBe(Action.Push);
    expect(pushAction.props.title).toBe("Open Repositories");
    expect(pushAction.props.target.type).toBe(RepositoryMappingManager);
    expect(pushAction.props.target.props.onChange).toBe(handleRepositoryMappingChange);
  });
});

describe("resolveGeneralSettingsIdeApp", () => {
  it("未対応値は Zed にフォールバックする", () => {
    expect(resolveGeneralSettingsIdeApp("cursor")).toBe("cursor");
    expect(resolveGeneralSettingsIdeApp("unknown")).toBe("zed");
  });
});
