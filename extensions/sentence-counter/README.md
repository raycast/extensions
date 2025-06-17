# sentence-counter

[![Website](https://img.shields.io/badge/Website-mysentencecounter.com-blue)](https://mysentencecounter.com)

A multilingual sentence counter that supports language detection, sentence splitting, and word counting for multiple languages including English, Chinese, Spanish, French, German, and Japanese.

## Features

- 🔍 Language detection for 6 languages (English, Chinese, Spanish, French, German, Japanese)
- 📝 Sentence splitting with support for multiple languages
- 📊 Word counting with language-specific rules
- 📈 Comprehensive text analysis
- 🚀 Zero dependencies
- 📦 Written in TypeScript with full type support

## Online Demo

Try our [online sentence counter](https://mysentencecounter.com/) for instant text analysis. The web version provides:
- Real-time sentence counting
- Instant language detection
- Word and character counting
- Average words per sentence
- Detailed sentence list
- No registration required
- 100% free to use

## Installation

```bash
npm install sentence-counter
```

## Usage

### Basic Usage

```typescript
import { analyzeText, detectLanguage, splitSentences, countWords, countSentences } from 'sentence-counter'

// Analyze text with comprehensive statistics
const text = "Hello! How are you? I'm fine. 你好！最近怎么样？我很好。"
const stats = await analyzeText(text)
console.log(stats)
// {
//   language: 'en',
//   sentenceCount: 6,
//   wordCount: 12,
//   sentences: ['Hello!', 'How are you?', "I'm fine.", '你好！', '最近怎么样？', '我很好。'],
//   words: ['Hello', 'How', 'are', 'you', "I'm", 'fine', '你好', '最近', '怎么样', '我', '很', '好']
// }

// Detect language
const lang = await detectLanguage(text)
console.log(lang) // 'en' or 'zh' depending on which language has more characters

// Split text into sentences
const sentences = splitSentences(text)
console.log(sentences)
// ['Hello!', 'How are you?', "I'm fine.", '你好！', '最近怎么样？', '我很好。']

// Count words
const words = await countWords(text)
console.log(words)
// ['Hello', 'How', 'are', 'you', "I'm", 'fine', '你好', '最近', '怎么样', '我', '很', '好']

// Count sentences
const count = countSentences(text)
console.log(count) // 6
```

### Supported Languages

The package supports the following languages:

- English (`en`)
- Chinese (`zh`)
- Spanish (`es`)
- French (`fr`)
- German (`de`)
- Japanese (`ja`)

## API Reference

### `detectLanguage(text: string): Promise<SupportedLanguage>`

Detects the primary language of the given text based on character frequency and patterns.

### `splitSentences(text: string): string[]`

Splits text into sentences based on language-specific and universal rules.

### `countWords(text: string): Promise<string[]>`

Counts words in text based on language-specific and universal rules.

### `countSentences(text: string): number`

Counts the number of sentences in the given text.

### `analyzeText(text: string): Promise<TextAnalysis>`

Analyzes text and returns comprehensive statistics including:
- Detected language
- Sentence count
- Word count
- Array of sentences
- Array of words

## Type Definitions

```typescript
type SupportedLanguage = 'en' | 'zh' | 'es' | 'fr' | 'de' | 'ja'

interface TextAnalysis {
	language: SupportedLanguage
	sentenceCount: number
	wordCount: number
	sentences: string[]
	words: string[]
}
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Related Projects

- [Online Sentence Counter](https://mysentencecounter.com/) - Web-based version with real-time analysis
- [GitHub Repository](https://github.com/smthokay929/sentence-counter) - Source code and documentation

## License

MIT © [smthokay929](https://github.com/smthokay929) 