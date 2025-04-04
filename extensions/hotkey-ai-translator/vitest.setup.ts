import { vi } from "vitest";

// @raycast/apiに関わる値をモック（個別のテストファイルでも上書き可）
// NOTE: このモック（vi.mock）と、@raycast/api自体のモック（raycast-api-mock.ts）の違いについては、vitest.config.tsのresolve.aliasのコメント内にあるChatGPTとのやり取り参照。とても学びになるぞ。究極、raycast-api-mock.tsのようなダミーを用意している場合って、グローバルでvi.mockする必要がないんだろうね。だって、raycast-api-mock.tsで定義しているもの自体が"@raycast/api"のダミーモックになっているんだから。
vi.mock("@raycast/api", () => ({
  getSelectedText: vi.fn(),
  showToast: vi.fn(),
  Toast: {
    Style: {
      Failure: "FAILURE",
      Success: "SUCCESS",
    },
  },
}));
