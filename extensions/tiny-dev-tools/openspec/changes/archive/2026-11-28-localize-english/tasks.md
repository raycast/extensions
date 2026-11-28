# Tasks

## 1. manifest 与文案英文化

- [x] 1.1 `package.json`：`author: "caitale"`；`keywords` 12 词；**顶层 `description`** 与 9 个命令 `description` 英文化；`$schema` 验证存在（现状已有）；`npm update @raycast/api`（1.x 内，package-lock 变更随提交）。验证：`npm run lint` + `npm run build` 通过
- [x] 1.2 用 rg 扫描 smoke 中文断言：`rg -n '[\x{4e00}-\x{9fff}]' scripts/smoke.ts`——预期命中：L82-85 四条 fmtRelative 断言（随翻译更新期望值）+ 断言描述字符串（顺手英文化）+ **L92/L112 的中文期望值是测试数据（URL/Base64 解码中文样本的正确结果），保留不动**。验证：命中清单与预期一致
- [x] 1.3 用户可见文案英文化（**全量扫描** `rg -n '[\x{4e00}-\x{9fff}]' src/`：双引号 ~164 处 + 模板/单引号 ~20 处）：9 个 tsx（Toast/EmptyView/subtitle/placeholder/Action title/List.Section/时间单位）+ **pure.ts 三类**（fmtRelative、jwtStatus labels、b64Decode 异常）+ prefill.ts 调试 Toast；中文注释保留。验证：typecheck + build 通过 + 同命令复扫仅剩注释
- [x] 1.4 README 双语重构：英文部分新写（Commands/Installation/Development）+ 中文全文保留在下半部。验证：结构完整、链接有效

## 2. 仓库卫生与验证

- [x] 2.1 `.workbuddy/` 卫生验证（从未被跟踪——实证修正）：`git ls-files .workbuddy` 为空 + `git log --all --oneline -- .workbuddy` 为空 + `.gitignore` 已含。验证：三查全空/已含，无操作需要
- [x] 2.2 git 历史敏感信息扫描（密钥模式 + 内网 IP 段模式，见 design 决策 4）。验证：仅测试公钥/文档命中，无真实敏感项
- [x] 2.3 本地全套验证：lint + typecheck + smoke（**155 passed，其中 4 条 fmtRelative 期望值已英文化**）+ build 全 0 退出；Raycast 热加载抽查 3 个命令的英文界面。验证：逐条执行
- [x] 2.4 提交；用户验收通过（本机 + 跨机英文界面、README review）。归档按 validate → archive → commit 顺序执行。push 待网络恢复后由用户执行（2026-11-27~28 推送持续挂起，本地提交安全）。验证：git 干净、9 spec 全绿

## 3. 上架执行（用户操作，本 change 交付指引）

- [x] 3.1 截图完成：`metadata/screenshot-1~6.png`，6 张全部 2000×1250 PNG（实测 sips 校验）；文件名零宽字符 U+200B 已修复（提交 31e3f04）。注：实际改用 macOS 原生窗口截图（Raycast Window Capture 与扩展热键冲突）。验证：命名连续、尺寸合规
- [ ] 3.2 （归档后用户执行，不阻塞归档）`npm run publish` 提审（GitHub 认证 → PR 标题 "Add extension"）→ 一周内响应 Community Manager 评论（14 天 stale / 21 天 close 红线）。**PR 描述必含差异化论证**（防"相似价值"拒绝）：
  ```
  Tiny Dev Tools differs from existing toolboxes (e.g. "Dev Toolbox") by:
  - Clipboard/selection prefill across ALL commands (copy → open → results ready)
  - Local JWT signature verification: HS256 + RS256 + ES256 (existing tools decode only)
  - JSON → type generation for TypeScript/Java/Go/Python (unique)
  - Zero runtime dependencies (pure TS, minimal security surface)
  - Spec-driven engineering: 155 assertions, 9 archived specs
  ```
  验证：PR 开出且 CI 绿、描述含差异化表
