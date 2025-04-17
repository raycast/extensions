import { vi } from "vitest";

// NOTE: このファイルの役割は、実際のプロダクトコードの中で使用される`@raycast/api`モジュールの実体の代わりとなるダミーを用意することで、Vitestのテスト実行時のimport時の依存解決ができるようにすること（vitest.config.ts参照）。
// NOTE: プロダクトコード内で @raycast/api からimportするものが増える場合はこのファイルにも増やすこと。でないと、テストコードからのimportの参照がまた解決できなくなるので注意。
export const getSelectedText = vi.fn();
export const showToast = vi.fn();
export const Toast = {
  Style: {
    Success: "SUCCESS",
    Failure: "FAILURE",
  },
};
