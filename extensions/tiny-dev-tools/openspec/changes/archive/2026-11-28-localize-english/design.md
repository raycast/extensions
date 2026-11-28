# Design

## Context

上架 Raycast Store 的前置准备。提交机制：`npm run publish` 向官方 monorepo（raycast/extensions）开 PR，Store 页面引用我们仓库的 README，审核 bot 校验 manifest 硬项。本 change 是纯展示层英文化 + 仓库卫生，零行为变更。

## Goals / Non-Goals

**Goals:**

- manifest 过审核 bot 全部硬校验（author=caitale、keywords、$schema、最新 API）
- 界面文案全英文（Store 审核要求与生态惯例）
- README 双语（英文=Store 门面，中文=项目文档保留）
- 仓库卫生（.workbuddy 退出跟踪、历史扫描）

**Non-Goals:**

- i18n 框架、标识符改名、代码注释翻译、截图执行、提审（见 proposal）

## Decisions

### 1. 翻译对照表（关键文案锚定，避免翻译漂移）

高频与状态类文案统一映射（实现按此表替换）：

| 类别 | 中文现状 | 英文 |
|---|---|---|

| Action title | 复制 / 粘贴到前台应用 / 选用该预设 / 验签 / 验证签名… | Copy / Paste to Frontmost App / Use Preset / Verify / Verify Signature… |
| 时间单位 | 秒 / 毫秒 / 微秒 | s / ms / µs |
| List.Section | 日期 → 时间戳 | Date → Timestamp |
| 未知值 | 未知 / 未知算法 | Unknown / Unknown algorithm |
| 复制值（jwt） | 复制值 | Copy Value |
| 已复制 / 已复制 {name} | Copied / Copied {name} |
| 粘贴 JWT 解码 | Paste a JWT to decode |
| ✅ 签名有效 / ❌ 签名不符 | ✅ Signature valid / ❌ Signature mismatch |
| ⚠ 公钥无法解析 / ⚠ 密钥类型不匹配 | ⚠ Unparseable public key / ⚠ Key type mismatch |
| 未签名 · 跳过验签 | Unsigned · verification skipped |
| 已过期 · N 前 / 尚未生效 / 有效 · 剩余 N / 无过期时间 claim | Expired · N ago / Not yet valid · N / Valid · N left / No expiry claim |
| 密码 · 16 位 · ~104 bits 强 | Password · 16 chars · ~104 bits Strong |
| 易读出 / 易阅读 / 全部字符 | Easy to say / Easy to read / All characters |
| 无法解析为 JWT | Not a valid JWT |
| 已解码 N 轮 | Decoded in N rounds |
| 解码失败 | Decode failed |
| ✓ 合法 JSON · N 字符 | ✓ Valid JSON · N chars |
| 输入为空 / 结果 | Input / Result |
| 验证签名… | Verify Signature… |
| 完整代码 · N 类型 | Full Code · N types |
| 已自动载入选中文本（N 字符）（json-format.tsx:103 实测原文） | Auto-loaded from selection (N chars) |

- **pure.ts 用户可见字符串三类**：`fmtRelative` 返回值英文完整格式——`just now` / `N seconds|minutes|hours|days|months|years ago` / `in N ...`（timestamp 与 jwt 共用，非缩写）；`jwtStatus` 四态 label（Expired · N ago / Not yet valid · in N / Valid · N left / No expiry claim，L472-480）；`b64Decode` 异常 → `Invalid Base64 character` / `Invalid Base64 length (% 4 === 1)`
- 原则：标签短促（Store 风格）、技术术语原样（HS256/PascalCase/json tag）、单位英文化（位→chars、词→words、字段→fields）
- 范围以**全量中文扫描**为准：`rg -n '[\x{4e00}-\x{9fff}]' src/`（含双引号 164 处 + 模板字符串/单引号 ~20 处：Toast `已解码 N 轮`、`复制${label}`、List.Section 标题等）；终验 = 同命令扫描仅剩中文注释；中文注释保留——非用户可见

### 2. manifest 变更明细

- `author: "tale"` → `"caitale"`（注册用户名）
- **顶层 `description`**（M3）：中文 → 英文一句话（"A developer toolbox: timestamp, URL/JSON/Base64 codecs, hash, JWT, case converter, password generator, JSON-to-types"）
- `keywords: ["json", "base64", "hash", "jwt", "case", "timestamp", "url", "converter", "password", "types", "typescript", "decoder"]`（≤20 个，覆盖 9 命令搜索场景）
- 命令 title 保持现值（"Timestamp" / "URL Codec" 等已符合 Apple Style：名词、首字母大写、无冠词）；description 逐条英文化（一句话说明 + 关键特性）
- `@raycast/api` `npm update` 至 **1.x 最新**（2.x major 单独立项——OQ1 定案：major 升级不与文案变更混装，污染回滚粒度）；`$schema` 已在 package.json:2（验证即可）；package-lock.json 变更随提交
- `mode: "view"` 等结构字段不动

### 3. README 双语结构

```
# Dev Toolbox
一句话简介（英文） + 9 命令一览表（英文）

## Commands（英文，每命令 3~4 行：做什么 + 关键交互 + 预填说明）
## Installation（Store 安装 + 源码构建两种）
## Development（四道闸门 + openspec 流程一段）

---
# 中文文档（现 README 全文保留，标题锚点加 zh-）
```

- 英文部分新写（面向 Store 用户，突出差异化：all-in-one、clipboard prefill、offline security）；中文部分原样搬运不改内容

### 4. 仓库卫生

- `.workbuddy/`：**验证性步骤**（实证：`git ls-files .workbuddy` 为空、.gitignore:6 已含）——从未被跟踪，无需 rm；memory 系统照常写本地
- git 历史扫描（m3 补 IP 模式）：密钥模式（api[_-]?key|secret|password|token=|BEGIN.*PRIVATE）+ 内网 IP 段 `\b(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)`——预期仅命中测试公钥与文档描述；发现真实敏感项才考虑历史重写（预期无）
- 提交信息中文保留：历史不重写（重写风险大于收益；中文提交信息在开源社区完全可接受）

### 5. smoke 零影响验证

实证（M2）：smoke L82-85 有 **4 条 fmtRelative 断言硬编码中文期望值**（"刚刚/1 分钟后/1 天前"），随翻译同步更新为英文期望值（断言语义不变，仅期望值字符串替换）；其余断言为数据/结构类零影响。tasks 1.2 的验证命令用 rg（macOS 无 grep -P）并明确预期命中清单。

## Risks / Trade-offs

- [个人使用体验变化] → 中文标签变英文；但命令关键词（hash/jwt/base64）本就是英文，日常调用零影响；Toast/标签类英文在技术工具中无理解门槛
- [翻译质量] → 对照表锚定关键文案；剩余 placeholder 类按同风格直译，用户 review 一遍英文 README
- [.workbuddy 退出跟踪后 CI 无影响] → CI 从不引用该目录
- [API 升级破坏] → 只升 minor/patch（^ 语义内 `npm update`），major 变更不引入；四道闸门验证

## Migration Plan

纯展示层变更 + 仓库卫生，无数据迁移。回滚 = git revert（单提交或按文件分组提交）。无 git 跟踪状态变更（.workbuddy 验证性确认）。
