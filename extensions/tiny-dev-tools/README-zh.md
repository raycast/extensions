# Tiny Dev Tools（中文文档）

[English](README.md) · [简体中文](README-zh.md)

> Tiny Dev Tools — Raycast 开发者工具箱：9 个命令覆盖日常转换、哈希、解码与代码生成。零外部运行时依赖、完全离线。

| 命令 | 功能 |
|---|---|
| Timestamp | Unix 时间戳（秒/毫秒/微秒）⇄ 日期、相对时间、多格式输出 |
| URL Codec | URL 编解码：4 种模式，含智能多轮解码 |
| JSON Format | JSON 格式化、校验与压缩，错误带行列定位 |
| Base64 | UTF-8 安全的 Base64 编解码，容忍 URL-safe |
| Hash | MD5 / SHA-1 / SHA-256 / SHA-512 / HMAC-SHA256（`文本 \|\| 密钥`） |
| Password Generator | CSPRNG 密码与口令短语，带强度估算 |
| JWT Decoder | 解码 claims、时间人性化，本地验签 HS256 / RS256 / ES256 |
| Case Converter | camelCase / snake_case / kebab-case / PascalCase / CONSTANT_CASE / dot.case |
| JSON to Types | 从 JSON 生成 TypeScript / Java / Go / Python 类型 |

**剪贴板预填**：每个命令都从选中文本或剪贴板自动填充——复制内容，打开命令，结果已经在那里。

## 命令详解

### ⏱ Timestamp（时间戳转换）
- 留空 = 实时时钟：秒 / 毫秒 / 微秒时间戳、本地 / UTC / ISO 时间，回车即复制
- 输入时间戳（10~16 位自动识别秒/毫秒/微秒）→ 本地 / UTC / ISO / 相对时间
- 输入日期字符串（`2026-11-03 12:30:30`、ISO）→ 三种时间戳
- 输入相对表达式：`-1d`、`+2h30m`、`-1w`（s/m/h/d/w 可组合）
- 自动预填：选中优先、剪贴板回退——纯数字文本

### 🔗 URL Codec（URL 编解码）
- `encodeURIComponent` / `encodeURI` / `decodeURIComponent`
- **智能解码**：循环解码直到输出不再变化（最多 5 轮）——双重/三重编码的埋点链接、日志 URL 一步还原
- 交换输入输出（⌃X）、清空（⌃K）、复制 / 粘贴动作
- 自动预填：含 %XX 自动切解码，纯 URL / 普通文本保持编码

### 🧾 JSON Format（JSON 格式化）
- 2 / 4 空格缩进格式化，或压缩为单行
- 递归排序 Key（对比 diff 神器）
- 语法校验：错误信息含行列号定位
- 自动预填（共享 input-prefill 框架）

### 🔤 Base64（Base64 编解码）
- UTF-8 安全：中文、Emoji 无乱码
- 解码容忍 URL-safe 字符（`-`/`_`）与缺失 padding
- 一键转 URL-safe 输出、交换输入输出（⌃X）、清空（⌃K）
- 自动预填：合法 Base64 自动切解码，普通文本保持编码

### # Hash（哈希/摘要）
- MD5 / SHA-1 / SHA-256 / SHA-512 / HMAC-SHA256 一次输入全量并排，大小写成对展示
- List 模式：↑↓ 移动、回车复制任意行；HMAC 用「文本 || 密钥」语法，密钥留空跳过
- 所见即所哈希（`||` 两侧均不 trim）；空输入显示语法说明
- 自动预填：任意文本（密钥侧不预填）
- 注：输入为单行（搜索栏），多行大段文本暂不支持；MD5 / SHA-1 用于校验与兼容场景，非安全用途

### 🔑 Password Generator（密码生成）
- 随机密码 + Passphrase 双行并排，回车复制；⌘R 一次性重新生成
- 三档预设（回车选用）：易读出（仅字母）/ 易阅读（排除歧义字符）/ 全部字符（91 字符集）
- 搜索栏数字调长度：密码 8~64（默认 16）、词数 3~8（默认 6 = 60 bits）
- 熵强度指示（bits + 弱/中/强档位）；必含各类字符 ≥1
- 随机源 `crypto.randomBytes`（CSPRNG，拒绝采样无 modulo bias），结果不落任何持久存储

### 🔓 JWT Decoder（JWT 解码）
- 三段式 token 粘贴即解码：Header / 状态 / claims 逐行展示，回车复制值
- 时间 claims（exp/iat/nbf）双格式：时间戳 + 本地时间 + 相对时间
- 状态判定（本机时间）：已过期 / 尚未生效 / 有效 / 无过期 claim
- 本地验签：HS256（`token || 密钥` 内联）、RS256 / ES256（⌘V 打开验签面板，公钥粘贴 PEM / JWK / 文件路径自动识别，剪贴板密钥自动预填）
- alg=none 显示「未签名 · 跳过验签」；错误三分语义：签名不符 / 密钥类型不匹配 / 公钥无法解析
- 自动预填：三段式 JWT
- 全程离线，token 与密钥不出本机、不写任何持久存储

### 🏷 Case Converter（命名格式转换）
- 六种格式全并排：camelCase / PascalCase / snake_case / kebab-case / CONSTANT_CASE / dot.case
- 任意格式输入即出全表（无需选源格式），↑↓ 移动回车复制
- 拆词语义对齐 change-case v4（双库 30 用例实测）：连续大写归前词（XMLHttpRequest → XML|Http|Request）、数字贴前词（base64Encode → base64|encode）
- 自动预填：合法 case 形态文本

### 🧬 JSON to Types（JSON 转类型代码）
- 粘贴 JSON 生成类型声明：TypeScript interface / Java class（嵌套 static class）/ Go struct（json tag）/ Python dataclass
- 四语言 ↑↓ 回车切换；「完整代码」整块复制，单类型单独复制
- 推断规则表（唯一权威）：数字按值三档（Integer/Long/Double、int/int64/float64）、单字段 null → unknown、数组内 null 混合 → T | null、混合数组 union（TS 语言内合并）、根数组三态（别名/同构提升/异构并集 optional）、非法键名按语言清洗
- 自动预填：复制 API 响应即可

## 通用能力：自动预填

「选中优先、剪贴板回退」：复制后直接打开命令即可预填（剪贴板路径**无需权限**）；选中路径依赖 macOS 辅助功能权限（设置 → 隐私与安全 → 辅助功能，给 Raycast 开启），无权限时自动走剪贴板路径。用户开始输入后预填即失效（清空不复活）；密钥侧永不来自预填。

## 安装

从 [Raycast Store](https://raycast.com/store) 安装：搜索 "Tiny Dev Tools"。

> 扩展通过审核后才会出现在 Store 中，在此之前无法公开安装。
