# Spec Delta

## Purpose

定义扩展的发布合规与持续验证要求：图标与 manifest 满足 Raycast 规范、CI 完整执行静态检查与构建、冒烟断言真实有效，保证扩展随时可发布。

## ADDED Requirements

### Requirement: 图标满足 Raycast 规格
扩展图标 SHALL 为 512×512 像素的 PNG；图标生成脚本 SHALL 以该尺寸输出，且生成结果可直接通过 `ray lint` 的图标校验。

#### Scenario: 生成图标并通过 lint
- **WHEN** 运行图标生成脚本后执行 `ray lint`
- **THEN** 图标尺寸校验无 error

### Requirement: manifest 满足 schema
`package.json` 作为扩展 manifest SHALL 满足 `ray lint` 的 schema 校验，包括必填的 `dependencies` 属性。

#### Scenario: lint 无 manifest 错误
- **WHEN** 执行 `ray lint`
- **THEN** package.json 校验无 error

### Requirement: CI 完整验证
向 main 分支的 push 与 PR SHALL 触发 CI 依序执行 lint、typecheck、冒烟测试与扩展构建，任一步骤失败 SHALL 使 CI 失败。

#### Scenario: push 触发完整流水线
- **WHEN** 代码推送到 main
- **THEN** CI 依序运行 `npm run lint`、`npm run typecheck`、`npm run smoke`、`npm run build`，全部通过才算成功

### Requirement: 冒烟断言真实有效
冒烟测试中的每个断言 SHALL 检验可能为假的条件；不得存在恒真表达式（如 `cond || true`）形式的断言。断言失败时测试 SHALL 以非零退出码结束。

#### Scenario: 无恒真断言
- **WHEN** 审查冒烟测试源码中的全部断言
- **THEN** 每个断言的条件都可能为假，不存在恒真形式

#### Scenario: 断言失败即失败
- **WHEN** 任一断言条件为假
- **THEN** 测试输出失败用例清单并以非零退出码结束
