## Why

将 Blazwitcher 的拼音搜索与快速导航带到 Raycast，统一访问 Chrome 标签页、书签和历史记录。现有官方扩展的数据获取方式可借鉴，但字面过滤不能替代拼音匹配。

## What Changes

- 新建独立扩展，提供统一入口和三个独立搜索入口。
- 使用 text-search-engine 支持中英文、全拼、首字母、混合和空格分词。
- 展示原文命中预览，先验证 Raycast 原生 UI 限制。
- 按真实 ID 切换标签，按所属配置打开书签和历史 URL。
- 提供配置选择、刷新、单来源错误隔离及明确的加载范围。
- 说明、约定、规格和界面使用中文，完成本机运行验证。

## Capabilities

### New Capabilities

- `browser-pinyin-search`：Chrome 本地数据搜索、命中展示及准确导航。

### Modified Capabilities

无，参考仓库保持不变。

## Impact

新增 TypeScript/React/Raycast 项目和 text-search-engine 依赖。运行需要本机 Raycast、Chrome 及适用的自动化/读取权限。数据在本地处理。详细方案见 `docs/实施计划.md`。
