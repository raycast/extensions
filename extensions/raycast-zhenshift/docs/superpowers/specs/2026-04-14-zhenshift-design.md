# ZhenShift 设计说明

## 1. 目标

构建一个 Raycast 翻译扩展 `ZhenShift`，提供单一命令 `Translate`，支持中文和英文之间的自动双向翻译。

第一版目标：

- 使用详情页式交互
- 通过 Raycast 扩展设置配置 OpenAI 兼容接口
- 自动识别输入是中文还是英文
- 中文自动翻译成英文，英文自动翻译成中文
- 提供加载状态、错误提示、复制结果、重新翻译
- 第一版仅接入 `chat/completions`，但代码结构预留未来扩展到 `responses`

非目标：

- 不做多语言翻译
- 不做历史记录
- 不做术语库或翻译风格切换
- 不做多命令扩展

## 2. 命名

- 项目目录名：`raycast-zhenshift`
- 扩展名：`ZhenShift`
- Command 名：`Translate`
- Command 副标题：`Auto Chinese <-> English Translation`

## 3. 方案选择

采用“单命令 + 服务层解耦”方案。

原因：

- 比单文件直连更易维护
- 第一版仍保持轻量，不会过度设计
- 后续扩展 `responses`、历史记录、连接检测时无需推倒重来

## 4. 交互设计

用户打开 `Translate` 命令后进入详情页。

页面包含以下区域：

- 输入区：输入或粘贴中文/英文原文
- 状态区：展示“待输入”“翻译中”“翻译成功”“翻译失败”
- 结果区：展示译文
- 方向提示：展示 `中文 -> English` 或 `English -> 中文`

Action 设计：

- `复制结果`
- `重新翻译`
- `清空输入`

交互规则：

- 输入变化后进行防抖，防止每次击键都发请求
- 建议防抖时间为 `400ms`
- 请求失败时保留原输入和上次结果上下文
- 请求成功后可一键复制译文

## 5. 配置设计

通过 Raycast 扩展设置提供以下配置项：

- `Base URL`
- `API Key`
- `Model`

配置原则：

- 命令启动时执行轻校验
- 发起请求前执行硬校验
- `Base URL` 统一规范为不带结尾 `/`
- 请求地址固定拼接为 `/chat/completions`

第一版兼容范围：

- 仅支持 OpenAI 兼容的 `chat/completions`
- 客户端接口设计预留未来扩展 `responses`

## 6. 模块划分

建议目录结构如下：

```text
src/
  translate.tsx
  lib/
    preferences.ts
    detect-language.ts
    openai-compatible-client.ts
    translate.ts
    errors.ts
```

模块职责：

- `src/translate.tsx`
  - Raycast 页面组件
  - 管理输入、加载态、错误态、结果态
  - 触发翻译动作和 Action
- `src/lib/preferences.ts`
  - 读取和校验 Raycast 设置
  - 规范化 `Base URL`
- `src/lib/detect-language.ts`
  - 基于字符分布做中英判定
  - 输出源语言、目标语言和展示文案
- `src/lib/openai-compatible-client.ts`
  - 封装 `chat/completions` 请求
  - 处理 HTTP 错误和响应提取
- `src/lib/translate.ts`
  - 构造翻译请求
  - 组织 system prompt 和 user message
  - 返回统一翻译结果
- `src/lib/errors.ts`
  - 定义统一错误类型
  - 将底层错误映射为用户可读中文提示

## 7. 自动语言识别设计

自动方向识别不完全依赖模型，而是在本地做轻量规则判定。

判定规则：

- 中文字符占优：目标语言设为英文
- 英文字母占优：目标语言设为中文
- 中英混合：按主导字符集判定
- 空字符串或仅符号：不发请求，展示待输入状态
- 无法有效判定：返回可读提示，提示用户输入中文或英文文本

设计原则：

- 方向判定在本地完成，保证稳定可控
- 翻译表达交给 LLM，保证质量
- 模块边界清晰，便于测试和排错

## 8. 翻译请求设计

请求模型时强约束输出格式，避免模型附带解释说明。

system prompt 原则：

- 模型角色仅为中英翻译器
- 只返回译文
- 不添加解释
- 不添加引号
- 不补充说明
- 不输出原文

user message：

- 直接传入原始文本
- 同时明确指定目标语言为 `English` 或 `中文`

结果处理原则：

- 优先从标准 `choices[0].message.content` 提取文本
- 若结构异常，抛出“返回格式不兼容”错误

## 9. 错误处理

第一版覆盖以下错误类型：

- 配置错误
  - 缺少 `Base URL`
  - 缺少 `API Key`
  - 缺少 `Model`
- 网络错误
  - 请求超时
  - 无法连接
- 接口错误
  - `401`
  - `403`
  - `404`
  - `429`
  - `5xx`
- 响应错误
  - 返回结构不符合 OpenAI 兼容格式

错误展示原则：

- 错误信息使用中文
- 信息应尽量面向用户可操作
- 保留原输入，不因错误清空内容

## 10. 测试策略

测试重点放在稳定逻辑层，而不是 UI 细节。

建议测试范围：

- `detect-language.ts`
  - 纯中文输入
  - 纯英文输入
  - 混合输入
  - 空输入
  - 仅符号输入
- `preferences.ts`
  - 缺少配置时报错
  - URL 规范化正确
- `translate.ts`
  - 能正确生成翻译目标语言
  - 能正确组装 prompt
  - 能正确解析成功响应
  - 能正确映射异常响应
- 组件轻量集成测试
  - 输入后进入加载态
  - 成功后显示译文
  - 失败后显示中文错误

测试原则：

- 优先测试纯函数和服务层
- 避免将主要测试价值押在 Raycast UI 结构上

## 11. 风险与后续扩展

已知风险：

- 不同“OpenAI 兼容接口”对响应格式兼容程度不完全一致
- 混合语言文本的自动方向识别可能存在边界误判
- Raycast 环境下的输入交互需要避免过于频繁的请求

后续扩展路径：

- 增加 `responses` 支持
- 增加连接测试命令
- 增加翻译历史
- 增加术语或风格控制

## 12. 实施建议

推荐实现顺序：

1. 初始化 Raycast 扩展工程
2. 补齐扩展配置和设置项
3. 先写 `detect-language` 与 `preferences` 测试
4. 实现 OpenAI 兼容客户端与翻译服务
5. 实现 `Translate` 页面
6. 补齐错误态和 Action
7. 运行验证并修正交互细节
