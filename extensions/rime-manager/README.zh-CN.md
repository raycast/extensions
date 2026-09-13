# Rime Manager

一个本地优先的 Raycast 扩展，用来在 macOS 上管理 Rime。扩展会自动发现 Rime 用户文件夹和已经安装的输入方案，不依赖某一个特定的配置发行版。

## 功能

- 重新部署 Rime 配置
- 同步用户词典和配置
- 置顶任意已识别输入方案能够产生的候选词
- 完全屏蔽候选词
- 仅在候选词进入前三名时将其移到第 4 位，不会删除候选词
- 默认隐藏屏蔽与降权规则，通过 macOS 本机身份验证后临时显示
- 搜索本机应用并设置应用级中英文状态、标点、输入码显示位置和 Vim 模式
- 打开 Rime 文件和鼠须管日志
- 创建完整备份，并在修改配置前自动保存快照
- 从主管理命令快速打开扩展偏好设置

## 输入方案兼容

扩展会扫描全部 `*.schema.yaml`，并结合 `default.yaml`、`default.custom.yaml` 和 `user.yaml` 识别启用方案与最近使用的方案。

兼容性按功能能力判断，不按配置发行版名称判断：

- 输入方案已经提供 `lua_filter@*pin_cand_filter` 时直接复用。
- 没有对应过滤器时，安装扩展自带的通用过滤器，并且只修改 `<schema_id>.custom.yaml`。
- 检测到现有 `blocked_words_filter.lua` 配置时优先复用，否则安装扩展自带的屏蔽过滤器。
- 降权使用独立过滤器，不会把候选词屏蔽掉。
- 不直接修改原始 `*.schema.yaml` 文件。

当前 Raycast 包仅支持 macOS，重新部署和同步功能通过鼠须管执行。扩展名称和输入方案管理逻辑不绑定具体前端，方便未来增加其他平台支持。

## 配置目录发现

扩展依次检查：偏好设置中指定的目录、`~/Library/Rime`，以及 Spotlight 在用户主目录中找到并通过校验的目录。检测结果会显示在主管理页面，也可以随时在扩展偏好设置中覆盖。

## 隐私

保存后，屏蔽词、降权词和输入码默认不会显示。显示内容时调用 Apple `LocalAuthentication`，密码和生物识别数据只由 macOS 处理。扩展只接收验证结果，不会读取或保存登录密码和生物识别信息。

## 本地开发

```bash
npm install
npm run dev
```

完整验证：

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

## 开源许可

MIT
