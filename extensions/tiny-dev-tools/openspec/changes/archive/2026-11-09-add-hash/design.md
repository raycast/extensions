# Design

## Context

现有四个命令全部遵循同一骨架：纯逻辑下沉 `src/lib/pure.ts` → smoke 断言覆盖 → 命令组件消费纯函数（受控 state + 只读结果区 + ActionPanel 动作）。`fix-lint-and-ux-polish` 已把「清空 ⌃K、结果区只读、空输入空结果」固化为编解码类命令的交互惯例。本 change 在同一骨架上新增第五个命令 `hash`，纯增量，不动现有命令。

## Goals / Non-Goals

**Goals:**

- 新增 `hash` 命令：MD5 / SHA-1 / SHA-256 / HMAC-SHA256，一次输入全量展示
- 零新增外部依赖：哈希能力全部来自 Node 标准库 `node:crypto`
- 与既有交互惯例严格对齐（结果只读、清空 ⌃K、空输入空结果、不自动读取剪贴板）
- smoke 断言同步覆盖（35 → 42），CI 四道闸门自动生效，无需改动

**Non-Goals:**

- 文件哈希（Form.FilePicker + 流式读取，另立 change）
- HMAC-MD5 / HMAC-SHA1、密钥 hex 解码、base64 输出格式
- 自动读取剪贴板/选中文本（延续既定推迟决策）

## Decisions

### 1. 全量并排展示（8 行），不复用 RadioGroup 选算法

哈希计算便宜，四种摘要同屏展示消除模式切换；高频场景「md5 与 sha256 对照使用」一步到位。RadioGroup 单选模式（url-codec / base64 的做法）会把「对照」变成两次切换。

- 备选：RadioGroup 选算法单行结果——交互与现有命令一致，但牺牲对照场景，不选。
- 结果区按算法成对分组（小写紧跟大写），可扫读性优先。

### 2. 哈希实现：包装 `node:crypto`，不手写算法

`crypto.createHash(algo).update(text, "utf8").digest("hex")`（HMAC 同理 `createHmac`）。正确性由 Node 标准库保证；手写 MD5/SHA 属于高风险低收益，禁止。

- `pure.ts` 因此首次依赖 Node 模块：Raycast 扩展运行于 Raycast 内嵌 Node 运行时，`node:crypto` 开箱可用；`ray build`（esbuild）自动 externalize 内置模块；smoke 跑在 tsx（Node）同样可用。终端用户零额外安装。

### 3. 大小写双份展示而非格式切换

8 行 = 4 算法 × 2 大小写，避免「切换输出格式」的额外交互。大写 = `result.toUpperCase()`，纯展示层，不重复计算。

### 4. HMAC 密钥语义：空密钥显示 `—` 跳过计算

密钥框是独立 `Form.TextField`（单行）。留空 → HMAC 两行显示 `—`；填写 → 实时计算。密钥按 UTF-8 文本处理，不做 hex 解码（AWS SigV4 场景留待有真实需求再加，README 注明）。

### 5. 结果区单行只读 + ActionPanel 按算法复制

哈希固定 32/64 字符单行，用 `Form.TextField`（url-codec 用 TextArea 是因为输出可多行，此处不需要）。只读沿用受控 value + 空 onChange 惯例。ActionPanel 无法逐行挂复制按钮（表单级组件），按算法给 4 个复制动作（小写 hex）：`复制 MD5` 为第一项（绑定回车）——日常「拿哈希去比对/搜索」以 MD5 频率最高，`复制 SHA-256` 一次 ↓ 可达；另加粘贴、清空。大写取用：点击只读框原生选中 → ⌘C。

空态与占位态语义（对应 spec scenario）：

- **粘贴动作**粘贴 MD5 小写 hex（与首选复制动作一致）；需要其他算法时先复制再粘贴，不为每算法单设粘贴动作。
- **输入为空**时触发任一复制/粘贴动作：不复制空串，Toast 提示「无结果可复制」（Raycast Action 不便按内容动态禁用，Toast 反馈更直白）。
- **HMAC 为占位 `—`**（密钥空）时触发复制 HMAC-SHA256：同样不复制占位符，Toast「无结果可复制」。

### 6. 空输入 → 空结果（不计算空串哈希）

`d41d8cd…` 是合法哈希但属噪音，打开命令就显示一排空串摘要反而困惑。与 url-codec / base64「空输入空结果」惯例一致。

### 7. 所见即所哈希（不 trim）

哈希场景差一个字符结果全变，静默 trim 尾部空白是坑。输入框内容原样进入哈希函数。

### 8. smoke 断言：42 个

新增 7 个：`md5/sha1/sha256("")` 空串三向量、`md5/sha1/sha256("hello")` 三向量、RFC 4231 Test Case 2 的 HMAC-SHA256（`key="Jefe"`、`data="what do ya want for nothing?"` → `5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843`）。全部为公开标准向量，期望值可独立验证。

## Risks / Trade-offs

- [`pure.ts` 引入 Node 依赖破坏「浏览器可用」隐含假设] → 该假设从未成立（TextEncoder 属 Web 全局但项目仅运行于 Node/Raycast）；换取标准库级正确性，值得
- [8 行结果表单偏长] → 单行短内容 + 成对分组，扫读成本可接受；换来的全量对照收益更大
- [ActionPanel 无逐行复制] → 4 算法级复制动作覆盖高频路径；大写走原生选中 + ⌘C，一击之事
- [MD5/SHA-1 弱算法出现在工具箱] → 定位为校验/兼容场景；README 注明「非安全用途」

## Migration Plan

无数据迁移。纯增量变更：新增 `src/hash.tsx`、pure.ts 追加函数、package.json 追加命令。回滚 = 删除 hash.tsx + revert 两个文件。README 断言数描述随 smoke 同步（35 → 42）。
