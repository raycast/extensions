# Word Insight - Architecture.md

# 系统架构设计

## 总体架构

User
↓
Raycast Extension
↓
Service Layer
├── Dictionary Service
├── Pronunciation Service
├── Synonym Service
├── Tech Dictionary Service
└── Statistics Service
↓
Cache Layer
↓
Remote APIs

---

## 目录结构

src/

commands/
search-word.tsx

components/
WordDetail.tsx
PronunciationPlayer.tsx
ExampleList.tsx

services/
dictionary.ts
pronunciation.ts
datamuse.ts
techDictionary.ts

storage/
favorites.ts
history.ts
settings.ts

types/
word.ts

utils/
cache.ts
markdown.ts

assets/
tech-dictionary.json

---

## 数据流

用户输入单词
↓
检查本地缓存
↓
缓存命中
→ 返回结果

缓存未命中
↓
调用 Dictionary API
↓
结果标准化
↓
写入缓存
↓
展示结果

---

## API设计

Dictionary API

GET
https://api.dictionaryapi.dev/api/v2/entries/en/{word}

Datamuse

GET
https://api.datamuse.com/words?rel_syn={word}

---

## 缓存策略

TTL

24小时

缓存Key

word:{keyword}

示例

word:denied
word:maintain

---

## 收藏设计

LocalStorage

favorites

结构

{
  "word": "denied",
  "createdAt": "2026-06-20"
}

---

## 学习历史

history

{
  "word": "throughput",
  "queryTime": "2026-06-20T10:00:00Z"
}

---

## 运维英语模式

内置JSON词库

tech-dictionary.json

包含

- Linux
- PostgreSQL
- TBase
- Kubernetes
- Docker
- Prometheus
- Elasticsearch
- ClickHouse

---

## 性能目标

首次查询

< 1000ms

缓存查询

< 100ms

发音播放

< 500ms

---

## 后续扩展

V2

AI Explain Service

OpenAI Compatible API

V3

Apple Music Lyrics Integration

V4

Browser Selection Lookup

V5

Personal Vocabulary Cloud Sync
