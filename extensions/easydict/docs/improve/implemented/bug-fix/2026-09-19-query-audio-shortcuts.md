# Agent Note: 消除朗读与重新查询的快捷键冲突

Status: implemented

## Problem

[主计划](../architecture/2026-09-19-command-boundaries-and-modularization.md) 工作项 07。[ActionPanel](../../../../src/features/search/ActionPanel.tsx) 的 Read Query Text 原先显式使用 macOS `⌘R` / Windows `Ctrl+R`，Requery All Services 使用相同组合的 Common.Refresh，两者出现在同一面板。修复前声明冲突已确认，实际按键分发未能确定；依据见 [API 审查](../architecture/2026-09-19-raycast-api-alignment.md#shortcuts-and-native-behavior)。

## Decision

Read Query Text 保留原有 macOS Cmd+R / Windows Ctrl+R，Requery All Services 改为 macOS Cmd+Option+R / Windows Ctrl+Alt+R，Read Result Text 保持 Cmd/Ctrl+Shift+R。保留既有朗读习惯，消除同一面板的声明冲突；主次动作、分组、其他快捷键和根导航保持不变。

最初实现 `c2b892e` 选择移动朗读键位，用户指出该兼容性取舍不妥，现已修正为上述决定。早期原生记录只描述该历史实现，不能作为当前组合的按键分发证据。

## Alternatives considered

**统一改用 Common。** Common 仍可与其他动作的显式按键冲突，需要检查整个面板。

**随动作整理一并修复。** 会难以分辨快捷键修复与动作顺序变化，保持独立 diff。

## Acceptance criteria

- [x] 记录原有朗读绑定、历史修复及当前恢复决定，区分菜单显示与实际按键分发证据。
- [x] 当前 macOS 菜单显示朗读 ⌘R、重查 ⌥⌘R、结果朗读 ⇧⌘R；同一面板无重复声明。当前组合实际分发与 Windows 宿主验证仍有缺口。
- [x] 首要和次要动作、默认快捷键及根导航保持不变。
- [x] 同步 README 及维护的中文说明，完成主计划的代码检查；原生行为不以 mock 测试代替。

## Risks

宿主版本可能改变 Common 的具体绑定。记录桌面版本并验证实际面板，不能仅依据静态声明断言分发结果。

## Verification

当前修正已通过 rebase 合入原快捷键提交，最终提交为 `d6bc29a fix(shortcuts): separate query audio from refresh`；原单独修正提交 `843c3e6` 不再出现在当前分支历史中。根代理 review、独立 subagent review 与 find-code-simplifications 均通过。完整面板无新的显式快捷键冲突，动作 JSX 顺序未变，中英文 README 与源码一致；未引入额外抽象或重复常量断言测试。npm run lint、npm test（49 文件 / 381 项）、npm run build 和 git diff --check 通过。rebase 后最终 tree 与已验证的 `843c3e6` 完全一致，range-diff 确认其余九个提交的补丁不变，因此未重复运行代码检查。

macOS 26.5.1 / Raycast 2.4.1.0 的正式构建已通过点击打开动作菜单验证：Read Query Text 显示 ⌘R，Read Result Text 显示 ⇧⌘R，Requery All Services 显示 ⌥⌘R。此次只验证标签，没有发送带修饰键的自动化输入。此前工具的组合键输入曾进入 Quick AI，底层原因未确定；用户已手动确认 ⌘M 正常。当前朗读/重查组合的实际按键分发、实际发声及 Windows 宿主未实测。

### Historical verification of c2b892e

修复前 macOS Raycast 2.4.1.0 的查询页动作菜单显示 Read Query Text 为 ⌘R、Read Result Text 为 ⇧⌘R；代码中 Requery All Services 使用 Common.Refresh。官方 Keyboard 表和安装版 API 2.4.1 类型已核对。修复前具体按键分发未能确定。修复后源码三组组合互异，全动作面板未发现重复；主次动作、分组与根导航代码没有改动。

根代理先做代码 review，再由独立 subagent 按 find-code-simplifications 检查，未发现需增加抽象或 mock 测试的强候选。英文及中文文档纠正旧 Cmd+S 说明，操作表限定查询结果页。npm run lint、npm test（43 文件 / 281 项）、npm run build 和 git diff --check 通过。

Mac 解锁后已完成最终产物的原生验证：菜单显示 Read Query Text 为 ⌥⌘R、Read Result Text 为 ⇧⌘R；按 ⌘⌥R 后日志出现 ActionPanel start read sound、AudioDownloader 与 AudioPlayer play，按 ⌘R 后查询列表重置并重新返回网络结果。详情 ⌘M、返回查询及根导航正常，主次动作保持现有发布提示/复制顺序。日志仅证明播放调用，不作为音质或实际听感测量。Windows 无运行环境，保留快捷键分发验证缺口。证据保存在 /tmp/easydict-refactor-evidence/07-read-query-native.log 与 final-native.log。
