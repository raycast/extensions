## MODIFIED Requirements

### Requirement: manifest 满足 schema
`package.json` 作为扩展 manifest SHALL 满足 `ray lint` 的 schema 校验，包括必填的 `dependencies` 属性；上架就绪状态 SHALL 包含：`author` 为注册的 Raycast 用户名、`keywords` 覆盖命令搜索场景、命令 `description` 为英文、`$schema` 字段存在、`@raycast/api` 为当前 major 内最新（2.x 升级单独立项）。

#### Scenario: lint 无 manifest 错误
- **WHEN** 执行 `ray lint`
- **THEN** package.json 校验无 error

#### Scenario: 上架就绪
- **WHEN** 审核 bot 校验提审的 manifest
- **THEN** author 与注册用户名匹配、keywords 非空、命令描述可被英文用户理解、API 版本非落后 major
