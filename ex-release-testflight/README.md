# EXTrade Release (Raycast Extension)

Raycast extension for releasing EXTrade iOS to TestFlight.

## 契约

- **唯一执行器**: `scripts/release_testflight.sh`(位于 iOS repo)
- **iOS repo 路径**: `/Users/wilton/Work/Project/ex-global/dev/ex-ios`
- **Raycast 项目根**: `/Users/wilton/Documents/Software/Raycast-Extension/ex-release-testflight`
- **本扩展只做 UI**: 收集参数 → 调脚本 → 展示 result.json / summary
- **禁止添加业务逻辑**(BUILD_NUMBER 计算、ASC 调用、xcodebuild/altool/curl 直调、重试、fail-fast 判定)
- **路径唯一来源**: `src/lib/config.ts`
- **`sync` 阶段**: 不读取任何 TS 目录 / result.json;只展示 stdout/stderr
- **iOS repo / Xcode 工程零 Raycast 引用**: 两边唯一连接点仅为脚本路径与 cwd

## 本地开发

```bash
cd /Users/wilton/Documents/Software/Raycast-Extension/ex-release-testflight
npm install
npm run dev   # 启动 Raycast Dev 模式,命令出现在 Raycast 搜索栏
```

## 图标

首次运行前请放一张 512x512 PNG 到:

`/Users/wilton/Documents/Software/Raycast-Extension/ex-release-testflight/assets/icon.png`

`package.json` 的 `icon` 字段使用 Raycast 官方约定的 `"icon.png"` 纯文件名形式(Raycast
会自动解析为 `assets/icon.png`)。无需修改。

## 前置条件

- iOS repo 完成阶段 B 修订
- iOS repo 存在: `/Users/wilton/Work/Project/ex-global/dev/ex-ios`
- `scripts/release_testflight.sh` 可执行
- `.env.release` / `~/.appstoreconnect/private_keys/AuthKey_*.p8` 已就位

## 不包含的内容(硬约束)

- 没有 AI 命令
- 没有历史结果列表
- 没有 Web GUI
- 没有对 iOS repo 的写入
- iOS/Xcode 工程中没有任何 Raycast 引用
