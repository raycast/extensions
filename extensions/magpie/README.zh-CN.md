# Magpie for Raycast

[Magpie](https://usemagpie.ai) 是一个菜单栏应用，给这台机器上的编程 agent 共用同一份模型目录。Codex、Claude Code、Gemini CLI、OpenCode 等各自指向你选的模型，请求经本机网关转发。

这个扩展是 `magpie` CLI 在 Raycast 里的入口，用来切换某个 agent 的模型、应用配置档，以及查看用量和订阅额度。

需要 Raycast 2.0 或更新版本，以及已安装的 magpie。扩展偏好 **Magpie CLI Path** 默认是 `~/.local/bin/magpie`。路径开头的 `~`，以及 `$HOME`、`${HOME}`，会展开成用户主目录，不会经过 shell。

命令：

- **Switch Agent Model**：列出已安装的 agent，并设置某个模型 id。
- **Use Profile**：列出配置档并应用。配置档在终端用 `magpie save <name>` 创建。
- **Show Usage**：查看今天、7 天、30 天或全部用量。
- **Show Subscription Quotas**：用 `magpie accounts --json` 显示订阅额度窗口。

```sh
npm install
npm test
npm run dev
```

`npm run dev` 会把扩展加载进正在运行的 Raycast。根搜索图标在这个进程启动时登记，改了 `assets/magpie.png` 之后需要重启它。进程停掉后，命令会从 Raycast 里消失。`npm test` 覆盖路径展开、CLI 输出解析，以及本机装有 magpie 时对 CLI 的只读调用。

[English](README.md)
