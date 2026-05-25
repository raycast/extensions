import { describe, expect, it } from "vitest";

import {
  resolveRepositoryMappingFormReturnToRoot,
  shouldAutoOpenRepositoryMappingForm,
} from "./repository-mapping-manager";

describe("shouldAutoOpenRepositoryMappingForm", () => {
  it("初回用の manager で読み込み完了後に mapping が空なら追加フォームを自動表示する", () => {
    expect(
      shouldAutoOpenRepositoryMappingForm({
        autoOpenAddForm: true,
        hasAutoOpened: false,
        isLoading: false,
        errorMessage: null,
        mappingCount: 0,
      }),
    ).toBe(true);
  });

  it("通常の manager・再表示済み・読み込み中・エラー中・設定済みでは自動表示しない", () => {
    expect(
      shouldAutoOpenRepositoryMappingForm({
        autoOpenAddForm: false,
        hasAutoOpened: false,
        isLoading: false,
        errorMessage: null,
        mappingCount: 0,
      }),
    ).toBe(false);
    expect(
      shouldAutoOpenRepositoryMappingForm({
        autoOpenAddForm: true,
        hasAutoOpened: true,
        isLoading: false,
        errorMessage: null,
        mappingCount: 0,
      }),
    ).toBe(false);
    expect(
      shouldAutoOpenRepositoryMappingForm({
        autoOpenAddForm: true,
        hasAutoOpened: false,
        isLoading: true,
        errorMessage: null,
        mappingCount: 0,
      }),
    ).toBe(false);
    expect(
      shouldAutoOpenRepositoryMappingForm({
        autoOpenAddForm: true,
        hasAutoOpened: false,
        isLoading: false,
        errorMessage: "failed",
        mappingCount: 0,
      }),
    ).toBe(false);
    expect(
      shouldAutoOpenRepositoryMappingForm({
        autoOpenAddForm: true,
        hasAutoOpened: false,
        isLoading: false,
        errorMessage: null,
        mappingCount: 1,
      }),
    ).toBe(false);
  });
});

describe("resolveRepositoryMappingFormReturnToRoot", () => {
  it("初回用の manager から開いた追加フォームは保存後に root へ戻す", () => {
    expect(resolveRepositoryMappingFormReturnToRoot(true)).toBe(true);
  });

  it("通常の manager から開いた追加フォームは保存後に manager へ戻す", () => {
    expect(resolveRepositoryMappingFormReturnToRoot(false)).toBe(false);
  });
});
