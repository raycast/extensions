# 🆕 新增功能说明

## 1. 📝 自动修正句子格式

### 问题场景
从 PDF 复制文本时经常出现以下问题：
- 句子中间有换行符
- 单词被连字符分割（如：`beau-\ntiful`）
- 多余的空格
- 句子残缺不完整

### 解决方案
AI 现在会自动：
✅ **移除不必要的换行符**
✅ **合并被分割的单词**
✅ **清理多余空格**
✅ **补全残缺的句子**

### 示例

**你从 PDF 复制的混乱文本**：
```
The resili-
ent entrepreneur    persevered
through countless setbacks.
```

**AI 自动修正为**：
```
The resilient entrepreneur persevered through countless setbacks.
```

卡片中会使用**修正后的句子**，确保学习体验流畅！

---

## 2. 📚 显示单词的各种形式

### 新增内容
背面现在会显示单词的所有常用形式，帮助你全面掌握单词用法。

### 包含的词形

#### 动词（Verbs）
- 原形、第三人称单数、现在分词、过去式、过去分词
- 例：`go, goes, going, went, gone`

#### 名词（Nouns）
- 单数、复数形式
- 例：`child, children` 或 `book, books`

#### 形容词（Adjectives）
- 原级、比较级、最高级、副词形式
- 例：`beautiful, more beautiful, most beautiful, beautifully`

#### 副词（Adverbs）
- 相关的形容词和副词形式
- 例：`quick, quickly, quicker, quickest`

---

## 🎯 新卡片格式示例

### 示例 1：动词变化

**原始 PDF 文本**（混乱）：
```
The scientist discov-
ered a correlation    between
sleep and memory.
```

**选中的词**：`discovered`

**生成的卡片**：

**正面（学习时）**：
```
The scientist [...] a correlation between sleep and memory.

句意：科学家发现了睡眠与记忆之间的相关性。
```

**背面**：
```
词形：discover, discovers, discovering, discovered

v. 发现；找到
```

---

### 示例 2：形容词变化

**原始文本**（残缺）：
```
eloquent speaker captivated the audience
```

**选中的词**：`eloquent`

**AI 补全并修正**：
```
The eloquent speaker captivated the audience.
```

**生成的卡片**：

**正面（学习时）**：
```
The [...] speaker captivated the audience.

句意：这位雄辩的演讲者吸引了听众。
```

**背面**：
```
词形：eloquent, more eloquent, most eloquent, eloquently

adj. 雄辩的；有说服力的
```

---

### 示例 3：名词变化

**选中的词**：`correlation`

**生成的卡片背面**：
```
词形：correlation, correlations

n. 相关性；关联
```

---

## 🔄 AI 输出格式

AI 现在返回 **4 行内容**：

```
第1行：修正后的完整句子
第2行：单词的各种形式（逗号分隔）
第3行：词性 + 中文释义
第4行：句子的中文翻译
```

**实际示例**：
```
The resilient entrepreneur persevered through countless setbacks.
resilient, more resilient, most resilient, resiliently
adj. 有韧性的；能迅速恢复的
这位坚韧的企业家在无数次挫折中坚持了下来。
```

---

## ✨ 优势

### 1. 解决 PDF 复制问题
- ✅ 不再担心格式混乱
- ✅ 自动获得完整、正确的句子
- ✅ 学习更流畅

### 2. 全面掌握词形变化
- ✅ 一次性看到所有常用形式
- ✅ 避免遇到词形变化时不认识
- ✅ 提高词汇灵活运用能力

### 3. 更智能的学习体验
- ✅ AI 自动处理格式问题
- ✅ 信息更丰富但不冗余
- ✅ 专注于学习而非格式调整

---

## 🚀 开始使用

1. **重启开发服务器**（如果正在运行）：
   ```bash
   # 按 Ctrl+C 停止
   # 然后重新运行
   cd /Users/yu/Projects/words2anki
   ./dev-start.sh
   ```

2. **测试新功能**：
   - 从 PDF 复制一段格式混乱的文本
   - 选中生词
   - 运行 `ankicard` 命令
   - 查看 Anki 卡片的新格式！

---

## 📝 技术细节

### 修改的文件
1. ✅ `src/utils/deepseek.ts` - 增强 AI prompt
2. ✅ `src/utils/anki.ts` - 更新卡片生成逻辑

### Prompt 优化
- 明确要求修正句子格式
- 要求提供完整的词形变化
- 保持输出格式的一致性

### 卡片渲染
- 使用修正后的句子进行 Cloze 删除
- 词形以美观的格式显示在背面
- 保持原有的词性和释义格式

---

现在你可以放心地从任何来源复制文本，AI 会帮你处理好一切！🎉
