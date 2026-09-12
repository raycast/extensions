import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getCustomActions,
  saveCustomAction,
  deleteCustomAction,
  getCustomAction,
} from "../api/custom-actions/custom-actions.service";
import { CustomAction } from "../api/custom-actions/custom-actions.types";
import { LocalStorage } from "@raycast/api";

// Mock LocalStorage as it's a direct dependency of the service
const mockStorage = new Map<string, string>();

vi.mock("@raycast/api", () => ({
  LocalStorage: {
    getItem: vi.fn((key: string) => Promise.resolve(mockStorage.get(key))),
    setItem: vi.fn((key: string, value: string) => {
      mockStorage.set(key, value);
      return Promise.resolve();
    }),
    removeItem: vi.fn((key: string) => {
      mockStorage.delete(key);
      return Promise.resolve();
    }),
    clear: vi.fn(() => {
      mockStorage.clear();
      return Promise.resolve();
    }),
  },
}));

const mockAction: CustomAction = {
  id: "123",
  title: "Test Action",
  vaultName: "MyVault",
  path: "Daily/{date}.md",
  template: "- {content}",
  mode: "append",
  silent: false,
  type: "capture", // default
};

describe("custom-actions.service", () => {
  beforeEach(() => {
    mockStorage.clear();
    vi.clearAllMocks();
  });

  it("should return empty array when no actions exist", async () => {
    const actions = await getCustomActions();
    expect(actions).toEqual([]);
  });

  it("should save a new action", async () => {
    await saveCustomAction(mockAction);
    const actions = await getCustomActions();
    expect(actions).toHaveLength(1);
    expect(actions[0]).toEqual(mockAction);
    expect(LocalStorage.setItem).toHaveBeenCalledWith("obsidian_custom_actions", expect.anything());
  });

  it("should update an existing action", async () => {
    // Save initial
    await saveCustomAction(mockAction);

    // Update
    const updatedAction = { ...mockAction, title: "Updated Title" };
    await saveCustomAction(updatedAction);

    const actions = await getCustomActions();
    expect(actions).toHaveLength(1);
    expect(actions[0].title).toBe("Updated Title");
  });

  it("should delete an action", async () => {
    await saveCustomAction(mockAction);
    await deleteCustomAction(mockAction.id);

    const actions = await getCustomActions();
    expect(actions).toHaveLength(0);
  });

  it("should retrieve a single action by id", async () => {
    await saveCustomAction(mockAction);
    const found = await getCustomAction(mockAction.id);
    expect(found).toEqual(mockAction);
  });

  it("should return undefined for non-existent action id", async () => {
    const found = await getCustomAction("non-existent");
    expect(found).toBeUndefined();
  });
});
