import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: true,
    // MEMO: setupFiles: テストを実行する前に読み込まれるファイルを指定するもの
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      // NOTE: tsconfig.jsonのbaseUrl/pathsで設定した絶対パスのエイリアスをVitestからも同じように参照できるようにするための設定（参考：https://dev.classmethod.jp/articles/setting-up-custom-module-import-prefixes-with-tsconfig-and-vitest-config/）。
      // NOTE: vite-tsconfig-pathsっていうライブラリ（https://github.com/aleclarson/vite-tsconfig-paths）を用いてplugins経由でこれを設定することもできるみたい。
      "@": resolve(__dirname, "src"),
      /**
       * NOTE: このエイリアス（__mocks__/raycast-api-mock.ts）の役割
       *
       * 普通、next/router などのモジュールはこういったエイリアスを設定せずともimportの依存解決ができるが、"@raycast/api" モジュールは、Raycastというネイティブアプリで動く都合からか、テストコード実行前のJSのimportの依存解決の際にその参照が解決できずエラーとなるらしい（エラー文：Error: Failed to resolve entry for package "@raycast/api". The package may have incorrect main/module/exports specified in its package.json.）。
       *
       * そのため、独自にモジュールの実体となるダミーを用意してあげる必要がある。それが以下に記載しているエイリアスであり、このファイルに実際のコードから使用されている関数などのダミーを用意することで、import時の依存解決ができるようになる。
       *
       * この件について、ChatGPTに聞いて理解を深めたチャットが以下。ChatGPTが最後にたくさん褒めてくれてて嬉しい😎
       * https://chatgpt.com/share/67d5635b-9cb4-8007-b71f-0ca26a09e0ae
       */
      "@raycast/api": resolve(__dirname, "src/__tests__/__mocks__/raycast-api-mock.ts"),
    },
  },
});
