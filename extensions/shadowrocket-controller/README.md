# Shadowrocket Controller for Raycast

一个本地 Raycast 扩展，用来控制 Shadowrocket 的常用开关：

- 打开 VPN
- 关闭 VPN
- 在控制面板中切换 VPN 和全局路由模式

## Commands

Raycast 中只保留 3 个命令：

- `Shadowrocket 控制面板`
- `关闭 Shadowrocket VPN`
- `打开 Shadowrocket VPN`

## 使用

```bash
npm install
npm run dev
```

控制面板里保留了：

- 切换 VPN
- 打开 VPN
- 关闭 VPN
- 全局代理、配置/规则、直连、场景路由

## 说明

Shadowrocket 的节点切换入口在当前 macOS 版本中没有稳定公开接口；URL Scheme 和直接写内部状态都不能可靠触发节点切换。因此节点切换功能已隐藏，只保留稳定可用的 VPN 和路由控制。
