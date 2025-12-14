# ✨ Anki 卡片格式已优化为 Cloze（填空）模式

## 🎯 新的卡片格式

### 正面（Front - Text 字段）
```
The {{c1::resilient}} entrepreneur persevered through countless setbacks.

句意：这位坚韧的企业家在无数次挫折中坚持了下来。
```

- **句子挖空**：生词被包在 `{{c1::...}}` 中，复习时会隐藏
- **句意**：显示完整的中文翻译，帮助理解语境

### 背面（Back Extra 字段）
```
adj. 有韧性的；能迅速恢复的
```

- **词性缩写**：使用标准英文缩写（n., v., adj., adv., prep. 等）
- **中文释义**：简洁的词义解释

---

## 📝 支持的词性缩写

| 缩写    | 全称         | 中文   |
| ------- | ------------ | ------ |
| n.      | noun         | 名词   |
| v.      | verb         | 动词   |
| adj.    | adjective    | 形容词 |
| adv.    | adverb       | 副词   |
| prep.   | preposition  | 介词   |
| conj.   | conjunction  | 连词   |
| pron.   | pronoun      | 代词   |
| interj. | interjection | 感叹词 |

---

## 🔄 与旧格式的对比

### 旧格式（Basic 模板）
**正面**：
- 生词 + 完整上下文句子

**背面**：
- 词性 + 中文释义
- 英文释义
- 句子翻译

### 新格式（Cloze 模板）✨
**正面（学习时）**：
- 挖空的句子（生词隐藏） + 句意

**正面（答题后）**：
- 完整句子 + 句意 + **词性和释义**

**优势**：
- ✅ 更符合语境学习法
- ✅ 强制回忆单词在句子中的用法
- ✅ 避免直接看到答案
- ✅ 信息更简洁，只保留最重要的内容

---

## ⚙️ 配置说明

### 默认配置已更新

`package.json` 中的默认配置：
```json
{
  "noteType": {
    "default": "Cloze",  // 从 "Basic" 改为 "Cloze"
  }
}
```

### Anki 中需要的笔记类型

确保你的 Anki 中有 **Cloze** 笔记类型：
- Anki 默认自带此模板
- 字段：`Text` 和 `Back Extra`
- 如果没有，Anki 会自动创建

---

## 🧪 使用示例

### 示例 1
**复制的句子**：
```
The eloquent speaker captivated the audience with her powerful words.
```

**选中的词**：`eloquent`

**生成的卡片**：

**正面显示**：
```
The [...] speaker captivated the audience with her powerful words.

句意：这位雄辩的演讲者用她有力的言辞吸引了听众。
```

**背面额外内容**：
```
adj. 雄辩的；有说服力的
```

---

### 示例 2
**复制的句子**：
```
Scientists have discovered a correlation between sleep and memory.
```

**选中的词**：`correlation`

**生成的卡片**：

**正面显示**：
```
Scientists have discovered a [...] between sleep and memory.

句意：科学家已经发现了睡眠与记忆之间的相关性。
```

**背面额外内容**：
```
n. 相关性；关联
```

---

## 🎓 学习流程

1. **看到挖空的句子** + 句子翻译
2. **尝试回忆**被挖空的单词
3. **点击显示答案**
4. **看到完整句子** + 词性和释义
5. **评价自己的回忆效果**（Again / Hard / Good / Easy）

---

## 💡 提示

### 如果想切换回旧格式

在 Raycast 扩展设置中：
- 将 **Anki Note Type** 改为 `Basic`
- 但需要修改代码以匹配 Basic 模板的字段

### 多义词处理

AI 会根据上下文选择最合适的词性和释义。

### 词形变化

代码会自动查找单词的各种形式：
- `run` → `running`
- `go` → `went`
- `beautiful` → `beautifully`

如果找不到匹配，会在句首添加挖空。

---

## ✅ 修改已完成

以下文件已更新：
1. ✅ `src/utils/deepseek.ts` - 优化 AI prompt
2. ✅ `src/utils/anki.ts` - 改用 Cloze 删除格式
3. ✅ `src/types.ts` - 更新类型定义支持 Cloze 字段
4. ✅ `package.json` - 默认笔记类型改为 Cloze

现在重新运行扩展即可使用新格式！🎉
