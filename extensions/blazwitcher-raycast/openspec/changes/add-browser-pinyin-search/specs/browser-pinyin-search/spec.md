## ADDED Requirements

### Requirement: 中文项目说明

系统 SHALL 提供中文项目说明、协作约定、计划和界面文案。

#### Scenario: 查看项目

- **WHEN** 用户打开项目
- **THEN** 可从中文 README 和 AGENTS 了解目标、状态及开发验证约定

### Requirement: 三类来源拼音搜索

系统 SHALL 使用 text-search-engine 搜索 Chrome 标签页、书签和历史记录，支持中英文、全拼、首字母、混合及空格分词输入。

#### Scenario: 搜索中文标题

- **WHEN** 用户输入标题对应的拼音或首字母
- **THEN** 三类来源的匹配记录可被检索，并可查看原文命中位置

#### Scenario: 筛选来源

- **WHEN** 用户使用统一入口的来源下拉框或前缀
- **THEN** 只展示所选来源的匹配结果

#### Scenario: 统一入口首次空搜索

- **WHEN** 书签或历史早于标签页完成首次读取
- **THEN** 首屏等待标签页首读后优先展示标签页，其他来源随后渐进加入

### Requirement: 原文命中展示

系统 SHALL 按引擎返回的原文区间展示命中预览，不以拼音替换原文；方案和使用说明必须明确原生列表样式限制。

#### Scenario: 拼音命中中文

- **WHEN** 输入 `zhongwen` 命中标题的 `中文`
- **THEN** 预览明确强调 `中文`，其余原文保持可读

### Requirement: 准确导航

系统 SHALL 在操作时按真实标签 ID 重新定位，并在所属配置打开书签和历史 URL。

#### Scenario: 标签被移动

- **WHEN** 用户搜索后移动标签再执行跳转
- **THEN** 切换至原标签 ID 对应的当前窗口及位置

#### Scenario: 标签已关闭

- **WHEN** 目标标签已关闭
- **THEN** 提示重新打开命令，不切换到旧索引对应的其他标签

### Requirement: 范围与错误隔离

系统 SHALL 明示历史读取范围，且单来源失败时保留其他来源结果。

#### Scenario: 历史不可读

- **WHEN** 历史数据库访问或查询失败
- **THEN** 显示该来源错误，同时保留可用标签和书签搜索

### Requirement: 本机验收

交付 SHALL 包含真实 Raycast 启动、拼音检索、命中展示及 Chrome 导航验证。

#### Scenario: 宣布完成

- **WHEN** 宣布功能完成
- **THEN** 有真实运行证据，且构建、逻辑测试与界面验证被分别记录
