/* eslint-disable @typescript-eslint/no-require-imports -- Raycast flat config 用 CommonJS require，为模板默认写法 */
const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");

module.exports = defineConfig([
  // raycast-env.d.ts 是 ray 自动生成的产物（已 gitignore），其头部的 eslint-disable 注释随 ray 版本变化，
  // 可能引用已被 typescript-eslint 移除的规则（如 ban-types）而报错。生成产物无需 lint，直接忽略。
  { ignores: ["raycast-env.d.ts"] },
  ...raycastConfig,
  {
    rules: {
      // ⌘⇧↑ / ⌘⇧↓ 等刻意使用的组合会被这条规则误判为应改用 Common.*（插件未跟上最新 Raycast API 的快捷键绑定）。
      "@raycast/prefer-common-shortcut": "off",
    },
  },
]);
