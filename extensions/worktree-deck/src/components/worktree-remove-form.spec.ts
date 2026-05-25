import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RemoveWorktreeForm } from "./worktree-remove-form";
import type { Worktree } from "../application/worktree.entity";
import { Form, confirmAlert } from "@raycast/api";

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
  const MockForm = Object.assign(
    (props: Record<string, unknown>) => {
      return React.createElement("form", props);
    },
    { Checkbox: MockCheckbox, Description: MockDescription },
  );
  return {
    Action: { SubmitForm: MockSubmitForm },
    ActionPanel: MockActionPanel,
    Alert: { ActionStyle: { Destructive: "destructive" } },
    Form: MockForm,
    Icon: {} as const,
    confirmAlert: vi.fn(),
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
    titleEntries: [
      {
        title: "Implement clearer delete popup",
        status: "working",
        latestMessage: null,
        updatedAt: 1,
        sessionKind: "main",
      },
    ],
    mergeStatus: "dirty",
    lastCommitAt: "2026-05-21 10:00",
    baseRef: "main",
    aheadCount: 2,
    behindCount: 1,
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
 * フォームの submit action props を取得する
 */
function findSubmitProps(root: React.ReactNode): Record<string, unknown> {
  if (!React.isValidElement(root)) {
    throw new Error("Form not found");
  }
  const actions = (root.props as { actions?: React.ReactNode }).actions;
  const submitActions = collectElements(
    actions,
    (node) => (node.props as { title?: string }).title === "Remove Worktree",
  );
  const submitAction = submitActions[0];
  if (!submitAction) {
    throw new Error("Submit action not found");
  }
  return submitAction.props as Record<string, unknown>;
}

describe("RemoveWorktreeForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ブランチ削除のチェックはデフォルトで外れている", () => {
    const tree = RemoveWorktreeForm({
      item: buildWorktree(),
      onRemove: vi.fn(),
    });

    const localProps = findCheckboxProps("deleteBranch", tree);
    const remoteProps = findCheckboxProps("deleteRemoteBranch", tree);

    expect(localProps.defaultValue).toBe(false);
    expect(remoteProps.defaultValue).toBe(false);
  });

  it("削除確認ではセッションタイトルと非同期の git status だけを表示する", async () => {
    vi.mocked(confirmAlert).mockResolvedValue(false);
    const tree = RemoveWorktreeForm({
      item: buildWorktree(),
      onRemove: vi.fn(),
    });
    const submitProps = findSubmitProps(tree);

    await (submitProps.onSubmit as (values: { deleteBranch: boolean; deleteRemoteBranch: boolean }) => Promise<void>)({
      deleteBranch: true,
      deleteRemoteBranch: false,
    });

    expect(confirmAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          ["Session:", "Implement clearer delete popup", "", "Git status:", "Status: dirty"].join("\n"),
        ),
      }),
    );
    const message = vi.mocked(confirmAlert).mock.calls[0]?.[0]?.message;
    expect(message).not.toContain("Kept:");
    expect(message).not.toContain("Deleted:");
    expect(message).not.toContain("Target:");
    expect(message).not.toContain("Path:");
    expect(message).toContain("Base: main");
    expect(message).toContain("Ahead/Behind: 2 / 1");
  });

  it("削除確認では synced の git status を表示しない", async () => {
    vi.mocked(confirmAlert).mockResolvedValue(false);
    const tree = RemoveWorktreeForm({
      item: { ...buildWorktree(), mergeStatus: "synced" },
      onRemove: vi.fn(),
    });
    const submitProps = findSubmitProps(tree);

    await (submitProps.onSubmit as (values: { deleteBranch: boolean; deleteRemoteBranch: boolean }) => Promise<void>)({
      deleteBranch: false,
      deleteRemoteBranch: false,
    });

    const message = vi.mocked(confirmAlert).mock.calls[0]?.[0]?.message;
    expect(message).not.toContain("Git status:");
    expect(message).not.toContain("Kept:");
    expect(message).not.toContain("Deleted:");
    expect(message).toBe("Session:\nImplement clearer delete popup");
  });
});
