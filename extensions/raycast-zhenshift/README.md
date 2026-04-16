# ZhenShift Raycast 扩展

ZhenShift 是一个在 Raycast 中运行的中英自动互译扩展。你在搜索框输入中文或英文后，它会自动判断方向，并通过 OpenAI 兼容 `chat/completions` 接口生成译文。

## 快速开始

```sh
npm install       # 安装所有依赖
npm run dev       # 启动 Raycast 本地开发模式
npm run build     # Raycast 构建命令
npm run lint      # Raycast lint，检查 manifest 与图标
npm run test      # 使用 vitest 运行单元测试
```

## 配置项

扩展设置中需要提供以下字段：

- `Base URL`：OpenAI 兼容接口地址，例如 `https://api.openai.com/v1`
- `API Key`：访问接口所需密钥
- `Model`：翻译模型名，例如 `gpt-4o-mini`

如果配置缺失，命令页会直接提示你打开扩展设置补全。

## 当前能力

- 自动识别输入是中文还是英文
- 中文自动翻译为英文，英文自动翻译为中文
- 输入停止 `400ms` 后自动发起翻译
- 支持复制译文、重新翻译、清空输入
- 对 OpenAI 兼容接口的 HTTP 错误和响应格式错误给出中文提示

## 测试状态

当前测试覆盖以下模块：

- `detect-language`：语言方向识别
- `preferences`：配置规范化与校验
- `openai-compatible-client`：请求与错误映射
- `translate`：翻译编排
- `translate-view`：页面状态模型

## 目录结构

- `src/translate.tsx`：Raycast 命令入口与详情面板交互
- `src/lib/`：语言识别、配置校验、OpenAI 客户端、翻译编排
- `tests/`：Vitest 单元测试
- `docs/`：存放 superpowers 相关文档
- `package.json`：定义 Raycast 扩展命令、脚本和依赖
- `tsconfig.json`：配置 TypeScript 编译器

## 当前限制

- 目前只支持 OpenAI 兼容的 `chat/completions`
- 只支持中英双向翻译
- 暂未实现翻译历史、术语库和风格控制

## 发布准备

当前仓库已经满足基础发布前校验：

- `npm test`
- `npm run lint`
- `npm run build`

并已补充：

- `publish` 脚本，可直接执行 `npm run publish`
- `CHANGELOG.md`
- Raycast 扩展设置项与命令元数据

发布前你还需要人工确认一项：

- 当前 [package.json](/Users/yellowsea/code/raycast_translate/.worktrees/feature-zhenshift/package.json) 中的 `author` 已设置为 `hh81300889`。如果后续切换发布账号，需要同步改成对应的 Raycast 用户名。
