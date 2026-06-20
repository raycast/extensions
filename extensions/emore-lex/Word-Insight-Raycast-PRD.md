# Word Insight - Raycast 英语学习插件需求文档

## 项目名称

**Word Insight**

副标题：

> A Raycast extension for pronunciation, meaning and language learning.

---

## 项目目标

开发一个 Raycast Extension，用于快速查询英语单词的：

- 发音
- 音标
- 音节拆分
- 中文释义
- 英文释义
- 词性
- 例句
- 词形变化
- 常见搭配
- 同义词
- 学习备注

目标体验参考：

- Google Pronunciation
- Cambridge Dictionary
- Apple Dictionary
- 欧路词典

但交互全部在 Raycast 内完成。

---

## 核心使用场景

作为运维工程师和技术人员，经常看到：

```text
denied
maintain
composure
provision
throughput
latency
resilience
deprecated
```

希望：

```text
⌘ + Space
输入单词

立即看到：

发音
音标
释义
例句
```

无需打开浏览器。

---

## 功能设计

### 1. 单词查询

输入：

```text
denied
```

显示：

- 单词标题
- 发音按钮
- 音标
- 音节拆分

### 2. 发音

显示：

```text
🇺🇸 /dɪˈnaɪd/
🇬🇧 /dɪˈnaɪd/
```

支持：

- Play US Pronunciation
- Play UK Pronunciation

### 3. Google 风格音节拆分

例如：

```text
de·nied
di-NYDE
```

其它示例：

```text
maintain
main·tain
men-TAIN
```

```text
composure
com·po·sure
kum-PO-zher
```

### 4. 中文释义

```text
deny

v.

1. 否认
2. 拒绝承认
3. 拒绝给予
4. 禁止进入
```

### 5. 英文释义

```text
to say that something is not true

to refuse to give something
```

### 6. 例句

```text
Access denied.
访问被拒绝。
```

```text
He denied the accusation.
他否认了这项指控。
```

### 7. 词形变化

```text
Base Form:
deny

Past:
denied

Past Participle:
denied

Present Participle:
denying
```

### 8. 常见搭配

```text
deny access
deny permission
deny responsibility
deny allegations
```

### 9. 同义词

```text
refuse
reject
decline
dispute
```

---

## 运维英语模式（核心差异化功能）

输入：

```text
permission denied
```

显示：

```text
运维场景：
权限不足

常见原因：
1. 文件权限不足
2. sudo 缺失
3. SELinux 拒绝
4. 数据库权限不足

常见命令：
chmod
chown
grant
```

支持以下领域：

- Linux
- PostgreSQL
- TBase
- Kubernetes
- Docker
- Prometheus
- Elasticsearch
- ClickHouse
- 云原生

---

## 收藏功能

快捷键：

```text
⌘ + S
```

数据格式：

```json
{
  "word": "denied",
  "created_at": "2026-06-20"
}
```

使用 Raycast LocalStorage 保存。

---

## 学习统计

显示：

```text
Today Viewed: 12
This Week: 63
Total Words: 582
```

---

## 数据源设计

### 第一优先

Free Dictionary API

https://dictionaryapi.dev/

用于获取：

- 音标
- 发音
- 释义
- 例句

### 第二优先

Datamuse

用于获取：

- 同义词
- 联想词
- 近义词

### 第三优先

内置技术词库

示例：

```json
{
  "denied": {
    "techMeaning": [
      "Permission denied → 权限不足",
      "Access denied → 访问被拒绝"
    ]
  }
}
```

---

## Raycast UI

组件：

- List
- Detail
- ActionPanel

Markdown 展示示例：

```markdown
# denied

🇺🇸 /dɪˈnaɪd/

## Meaning

否认
拒绝

## Examples

Access denied.
访问被拒绝。

## Technical Usage

Permission denied
权限不足
```
---

## 快捷动作

- Play US Pronunciation
- Play UK Pronunciation
- Copy Word
- Copy IPA
- Copy Meaning
- Add To Favorites
- Open Cambridge
- Open Google Dictionary

---

## 技术要求

- TypeScript
- React
- Raycast API
- 本地缓存
- 离线缓存
- 深色模式支持
- 响应时间 < 500ms

---

## 版本规划

### V1

- 单词查询
- 发音
- 释义
- 例句
- 收藏

### V2

- AI 单词解释
- 技术场景解释
- 学习统计

### V3

- Apple Music 歌词划词查询
- 浏览器划词查询
- 生词本同步

---

## UI 风格

参考：

- Google Pronunciation
- Apple Dictionary

设计要求：

- 简洁
- 现代
- Apple 风格
- 优先阅读体验
- 不采用传统词典密集布局
