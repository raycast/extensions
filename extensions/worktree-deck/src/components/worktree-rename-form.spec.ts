import React from "react";
import { describe, expect, it, vi } from "vitest";

import { Form } from "@raycast/api";
import { RenameWorktreeForm } from "./worktree-rename-form";
import type { Worktree } from "../application/worktree.entity";

vi.mock("@raycast/api", () => {
  const MockActionPanel = (props: Record<string, unknown>) => {
    return React.createElement("action-panel", props);
  };
  const MockSubmitForm = (props: Record<string, unknown>) => {
    return React.createElement("submit-form", props);
  };
  const MockCheckbox = (props: Record<string, unknown>) => {
    return React.createElement("checkbox", props);
  };
  const MockDescription = (props: Record<string, unknown>) => {
    return React.createElement("description", props);
  };
  const MockTextField = (props: Record<string, unknown>) => {
    return React.createElement("text-field", props);
  };
  const MockForm = Object.assign(
    (props: Record<string, unknown>) => {
      return React.createElement("form", props);
    },
    { Checkbox: MockCheckbox, Description: MockDescription, TextField: MockTextField },
  );
  return {
    Action: { SubmitForm: MockSubmitForm },
    ActionPanel: MockActionPanel,
    Form: MockForm,
    Icon: {} as const,
    useNavigation: () => ({ pop: vi.fn() }),
  };
});

/**
 * テスト用の worktree 情報を作成する
 */
function buildWorktree(): Worktree {
  return {
    repo: "repo",
    path: "/repo/path",
    branch: "feature/test",
  };
}

/**
 * 指定条件に合う React 要素を集める
 */
function collectElements(
  element: React.ReactNode,
  predicate: (node: React.ReactElement) => boolean,
  results: React.ReactElement[] = [],
): React.ReactElement[] {
  if (Array.isArray(element)) {
    element.forEach((child) => collectElements(child, predicate, results));
    return results;
  }
  if (!React.isValidElement(element)) {
    return results;
  }
  if (predicate(element)) {
    results.push(element);
  }
  const children = (element.props as { children?: React.ReactNode }).children;
  if (children) {
    collectElements(children, predicate, results);
  }
  return results;
}

/**
 * チェックボックスの props を取得する
 */
function findCheckboxProps(id: string, root: React.ReactNode): Record<string, unknown> {
  const checkboxes = collectElements(root, (node) => node.type === Form.Checkbox);
  const checkbox = checkboxes.find((node) => (node.props as { id?: string }).id === id);
  if (!checkbox) {
    throw new Error(`Checkbox not found: ${id}`);
  }
  return checkbox.props as Record<string, unknown>;
}

/**
 * テキストフィールドの props を取得する
 */
function findTextFieldProps(id: string, root: React.ReactNode): Record<string, unknown> {
  const textFields = collectElements(root, (node) => node.type === Form.TextField);
  const textField = textFields.find((node) => (node.props as { id?: string }).id === id);
  if (!textField) {
    throw new Error(`TextField not found: ${id}`);
  }
  return textField.props as Record<string, unknown>;
}

describe("RenameWorktreeForm", () => {
  it("新しいブランチ名には現在のブランチ名を初期表示する", () => {
    const tree = RenameWorktreeForm({
      item: buildWorktree(),
      onRename: vi.fn(),
    });
    const fieldProps = findTextFieldProps("newBranch", tree);
    expect(fieldProps.defaultValue).toBe("feature/test");
  });

  it("リモート名変更チェックはデフォルトで外れている", () => {
    const tree = RenameWorktreeForm({
      item: buildWorktree(),
      onRename: vi.fn(),
    });
    const remoteProps = findCheckboxProps("renameRemoteBranch", tree);
    expect(remoteProps.defaultValue).toBe(false);
  });
});
