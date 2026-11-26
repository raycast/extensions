/* eslint-disable @typescript-eslint/no-require-imports -- Raycast flat config 用 CommonJS require，为模板默认写法 */
const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");
const reactHooks = require("eslint-plugin-react-hooks");

// 跨文件夹的 import 一律用 @/ 别名：../ 和 ../../ 会随文件移动而失效，也看不出指向哪个文件夹。
// 相对路径只允许 ./（同一文件夹里的兄弟文件）。
// 每条 no-restricted-imports 都要带上它：同一文件后定义的规则会整条替换前面的，不能单独写一条。
const CROSS_FOLDER = {
  group: ["../**"],
  message: "跨文件夹的 import 用 @/ 别名，相对路径只允许 ./。",
};

// src/core/ui 的分层：projects 可以打开 bounces / collections / cleanup，
// 这三个之间不能互相引用，也不能反向引用 projects。
const FEATURE_SIBLINGS = {
  bounces: ["projects", "collections", "cleanup"],
  collections: ["projects", "bounces", "cleanup"],
  cleanup: ["projects", "bounces", "collections"],
};

// 跨文件夹一律用 @/ 别名，所以分层规则只认别名。
const featurePaths = (name) => [`@/core/ui/${name}`, `@/core/ui/${name}/**`];

// 功能文件夹之间只认 index.ts：深层路径一律拦掉。
const deepOnly = (name) => ({
  group: [`@/core/ui/${name}/**`],
  message: `只能从 @/core/ui/${name} 引用，不要引用内部文件。`,
});

const featureLayering = Object.entries(FEATURE_SIBLINGS).map(([feature, forbidden]) => ({
  files: [`src/core/ui/${feature}/**`],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          ...forbidden.map((name) => ({
            group: featurePaths(name),
            message: `${feature} 不能引用 ${name}：依赖只能从 projects 往下走。`,
          })),
          CROSS_FOLDER,
        ],
      },
    ],
  },
}));

// projects 可以打开另外三个功能，但只能通过它们的 index.ts。
const projectsLayering = {
  files: ["src/core/ui/projects/**"],
  rules: {
    "no-restricted-imports": [
      "error",
      { patterns: [...["bounces", "collections", "cleanup"].map(deepOnly), CROSS_FOLDER] },
    ],
  },
};

// 类型文件夹不能引用功能文件夹，否则会形成反向依赖。
const typeFolders = {
  files: ["src/core/ui/actions/**", "src/core/ui/components/**", "src/core/ui/hooks/**", "src/core/ui/shared/**"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          ...["projects", "bounces", "collections", "cleanup"].map((name) => ({
            group: featurePaths(name),
            message: `不能引用功能文件夹 ${name}：依赖只能从功能文件夹往下走。`,
          })),
          CROSS_FOLDER,
        ],
      },
    ],
  },
};

// core 只放不碰 Raycast 界面 API 的逻辑：界面反馈（Toast、确认框、Action 等）和 core/ui 都只能从 core/ui 里用。
// 存储、缓存、偏好、environment 这类非界面 API 不在此列；Color 是标签颜色数据，也不算界面反馈。
const CORE_UI_API = [
  "Action",
  "ActionPanel",
  "Alert",
  "Clipboard",
  "Detail",
  "Form",
  "Grid",
  "Icon",
  "List",
  "Toast",
  "confirmAlert",
  "closeMainWindow",
  "openExtensionPreferences",
  "showHUD",
  "showToast",
  "useNavigation",
];

const coreLayering = {
  files: ["src/core/**"],
  ignores: ["src/core/ui/**"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        paths: [
          {
            name: "@raycast/api",
            importNames: CORE_UI_API,
            message: "core 不能碰界面 API：界面反馈放到 core/ui 里。",
          },
        ],
        patterns: [
          {
            group: ["@/core/ui", "@/core/ui/**"],
            message: "core 不能引用 core/ui：依赖只能从界面往下走。",
          },
          CROSS_FOLDER,
        ],
      },
    ],
  },
};

// 其余文件（命令入口、src/daws 等）只拦跨文件夹的相对路径。
const crossFolderOnly = {
  files: ["src/**"],
  rules: {
    "no-restricted-imports": ["error", { patterns: [CROSS_FOLDER] }],
  },
};

// 用户可见文字只能来自文案表。字面部分含字母才报：`—`、`\n` 这类分隔符不算文字，
// 纯拼接 strings 常量的模板字符串因此不会被拦。
const VISIBLE_ATTRS = "title|subtitle|text|placeholder|searchBarPlaceholder|navigationTitle|tooltip|message";
const VISIBLE_PROPS = "text|tooltip|tag|title|subtitle|message|placeholder";
const LITERAL_TEXT = "字面文字写进了界面代码：放进文案表（src/strings.ts 或 src/daws 下的文案表）。";
const hardcodedText = {
  files: ["src/**"],
  // 文案表本身就是写文字的地方。
  ignores: ["src/strings.ts", "src/daws/labels.ts", "src/daws/*/strings.ts"],
  rules: {
    "no-restricted-syntax": [
      "error",
      {
        selector: `JSXAttribute[name.name=/^(${VISIBLE_ATTRS})$/] > Literal[value=/[A-Za-z]/]`,
        message: LITERAL_TEXT,
      },
      {
        selector: `JSXAttribute[name.name=/^(${VISIBLE_ATTRS})$/] > JSXExpressionContainer > Literal[value=/[A-Za-z]/]`,
        message: LITERAL_TEXT,
      },
      {
        selector: `JSXAttribute[name.name=/^(${VISIBLE_ATTRS})$/] > JSXExpressionContainer > TemplateLiteral > TemplateElement[value.raw=/(?<!\\\\)[A-Za-z]/]`,
        message: LITERAL_TEXT,
      },
      {
        selector: `Property[key.name=/^(${VISIBLE_PROPS})$/] > Literal[value=/[A-Za-z]/]`,
        message: LITERAL_TEXT,
      },
      {
        selector: `Property[key.name=/^(${VISIBLE_PROPS})$/] > TemplateLiteral > TemplateElement[value.raw=/(?<!\\\\)[A-Za-z]/]`,
        message: LITERAL_TEXT,
      },
    ],
  },
};

module.exports = defineConfig([
  // raycast-env.d.ts 是 ray 自动生成的产物（已 gitignore），其头部的 eslint-disable 注释随 ray 版本变化，
  // 可能引用已被 typescript-eslint 移除的规则（如 ban-types）而报错。生成产物无需 lint，直接忽略。
  { ignores: ["raycast-env.d.ts"] },
  ...raycastConfig,
  {
    plugins: { "react-hooks": reactHooks },
    rules: {
      // 依赖数组写错不会有别的工具兜底，现有代码已清干净，按 error 拦。
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
    },
  },
  {
    rules: {
      // ⌘⇧↑ / ⌘⇧↓ 等刻意使用的组合会被这条规则误判为应改用 Common.*（插件未跟上最新 Raycast API 的快捷键绑定）。
      "@raycast/prefer-common-shortcut": "off",
    },
  },
  crossFolderOnly,
  hardcodedText,
  ...featureLayering,
  projectsLayering,
  typeFolders,
  coreLayering,
]);
