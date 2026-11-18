# MyIP for Raycast

输入 `myip`，两行看当前机器的真实内网 IPv4 和真实公网 IPv4。

```text
Internal IP: 192.168.1.42
External IP: 203.0.113.42
```

打开视图本身不写剪贴板；复制都走 Action Panel：

| 动作 | 快捷键 |
| --- | --- |
| `Copy Public IP`（默认动作） | `Enter` |
| `Copy Internal IP` | `⌘ Enter`（Windows：`Ctrl+Enter`） |
| `Refresh` | `⌘ R` |

## 取数方式

- Internal IP：`os.networkInterfaces()`，只保留物理网卡上的 RFC1918 IPv4。
  - 过滤 `utun*`、`bridge*`、`awdl*`、`llw*`、`docker*`、`veth*`、`vmnet*`、`vEthernet*` 等 Docker / VPN / 虚拟机虚拟网卡。
  - 多个真实内网地址用逗号并列。
- External IP：`curl -s -f --noproxy '*' --max-time 5 -4 https://myip.ipip.net`。
  - `--noproxy '*'` 保证即使 shell 里配了 `HTTP_PROXY`，也不会拿代理出口 IP 冒充宽带公网 IP。
  - curl 不可用或失败时，并行回退到 Node `fetch` 和 `ipv4.ipw.cn` / `ip.3322.net` / `cip.cc`。

只处理 IPv4；没有公网 IPv6 输出。

## 开发

```bash
npm install
npm test        # 单元测试：IPv4 解析、私网判断、虚拟网卡过滤、两行格式
npm run lint
npm run build
npm run dev     # 在 Raycast 中加载并监听改动
```

Raycast 里输入 `myip` 应该能看到 **MyIP → My IP**。`npm run dev` 首次运行会把扩展注册到
`~/.config/raycast/extensions/myip`。
