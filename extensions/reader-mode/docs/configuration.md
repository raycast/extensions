# Configuration

This document describes how to configure and customize the Reader extension's AI summarization system.

## Overview

Reader uses a modular configuration system for AI-powered summaries, allowing fine-tuned control over:
- Which AI model handles each summary style
- Creativity/temperature levels per style
- Prompt templates and formatting
- Translation language options

All configuration is centralized in `src/config/` for easy management.

---

## AI Model Configuration

**File:** `src/config/ai.ts`

### Structure

```typescript
interface AIStyleConfig {
  model: AI.Model;
  creativity: "none" | "low" | "medium" | "high" | "maximum";
}

export const AI_SUMMARY_CONFIG: Record<SummaryStyle, AIStyleConfig>
```

### Current Configuration

| Summary Style | Model | Creativity | Rationale |
|--------------|-------|------------|-----------|
| **Overview** | GPT-5 nano | Low | Factual summary requires consistency |
| **Opposing Sides** | GPT-5 nano | Low | Analytical comparison benefits from precision |
| **The 5 Ws** | GPT-5 nano | Low | Structured extraction needs accuracy |
| **ELI5** | GPT-5 nano | Medium | Simplified explanations allow more flexibility |
| **Translated** | GPT-5 nano | Low | Translation should be direct and accurate |
| **Entities** | GPT-5 nano | Low | Entity extraction requires precision |
| **Arc-style** | GPT-5 nano | Low | Fact-heavy summaries need consistency |

### Creativity Levels

| Level | When to Use | Example Styles |
|-------|-------------|----------------|
| **None** | Deterministic output required | (Not currently used) |
| **Low** | Factual, consistent summaries | Overview, 5 Ws, Entities |
| **Medium** | Balance creativity and accuracy | ELI5 |
| **High** | Creative interpretation | (Not currently used) |
| **Maximum** | Highly creative responses | (Not currently used) |

**Note:** All current styles use GPT-5 nano for speed and cost efficiency. You can upgrade to GPT-5 or higher models for improved quality at the cost of latency.

### Customizing AI Config

To change the model or creativity for a style:

```typescript
// In src/config/ai.ts
export const AI_SUMMARY_CONFIG: Record<SummaryStyle, AIStyleConfig> = {
  overview: {
    model: AI.Model["OpenAI_GPT-5"],  // Upgrade to full GPT-5
    creativity: "medium",              // Increase creativity
  },
  // ... other styles
};
```

Available models (from `@raycast/api`):
- `AI.Model["OpenAI_GPT-5_nano"]` — Fast, efficient
- `AI.Model["OpenAI_GPT-5"]` — Balanced quality/speed
- `AI.Model["Anthropic_Claude_Sonnet"]` — High quality
- `AI.Model["Anthropic_Claude_Opus"]` — Maximum quality

---

## Prompt Configuration

**File:** `src/config/prompts.ts`

### Structure

```typescript
interface PromptConfig {
  label: string;  // Display name shown in UI
  buildPrompt: (context: string, options?: TranslationOptions) => string;
}

export const SUMMARY_PROMPTS: Record<SummaryStyle, PromptConfig>
```

### Prompt Anatomy

Each prompt receives a **context** built from:

```typescript
Article Title: "{title}"

Article Content:
{full_text_content}
```

The prompt template then adds instructions on top of this context.

### Example: Overview Style

```typescript
overview: {
  label: "Overview",
  buildPrompt: (context) => `${context}

Summarize this article with:
1. A single one-liner summary (one sentence capturing the main point)
2. Three bullet points highlighting the key information

Format your response EXACTLY like this:
[one-liner summary]

- [key point 1]
- [key point 2]
- [key point 3]`,
}
```

**Key elements:**
- Clear, specific instructions
- Explicit formatting requirements
- Example output structure

### Customizing Prompts

To modify a summary style's behavior, edit its prompt in `src/config/prompts.ts`.

**Example: Make ELI5 more casual**

```typescript
eli5: {
  label: "Explain Like I'm 5",
  buildPrompt: (context) => `${context}

Hey! Explain this article like you're talking to a 5-year-old kid.
Use super simple words, short sentences, and fun examples they'd understand.
No complicated jargon or big words!

Keep it friendly and make it 2-3 short paragraphs.`,
}
```

### Adding a New Summary Style

1. **Add the type** to `src/types/summary.ts`:
```typescript
export type SummaryStyle =
  | "overview"
  | "my-new-style"  // Add here
  | ...;
```

2. **Add AI config** in `src/config/ai.ts`:
```typescript
export const AI_SUMMARY_CONFIG: Record<SummaryStyle, AIStyleConfig> = {
  "my-new-style": {
    model: AI.Model["OpenAI_GPT-5_nano"],
    creativity: "low",
  },
  // ...
};
```

3. **Add prompt config** in `src/config/prompts.ts`:
```typescript
export const SUMMARY_PROMPTS: Record<SummaryStyle, PromptConfig> = {
  "my-new-style": {
    label: "My New Style",
    buildPrompt: (context) => `${context}

Your instructions here...`,
  },
  // ...
};
```

4. **Add to preferences** in `package.json`:
```json
{
  "name": "defaultSummaryStyle",
  "data": [
    { "title": "My New Style", "value": "my-new-style" },
    // ...
  ]
}
```

5. **Add action** in `src/actions/ArticleActions.tsx`:
```typescript
<ActionPanel.Section title="Summary Styles">
  <Action
    title="My New Style"
    icon={Icon.Stars}
    shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
    onAction={() => onSummarize("my-new-style")}
  />
  {/* ... other actions */}
</ActionPanel.Section>
```

---

## Summary Style Details

### Overview
**Purpose:** Quick, scannable summary
**Format:** One-liner + 3 bullets
**Best for:** News, blog posts, general articles

**Output example:**
```
Article discusses the impact of AI on creative work.

- AI tools are automating routine creative tasks
- Concerns about job displacement in creative fields
- New opportunities emerging for AI-assisted creativity
```

### Opposing Sides
**Purpose:** Balanced perspective analysis
**Format:** Two contrasting viewpoints
**Best for:** Opinion pieces, debates, controversial topics

**Output example:**
```
**Perspective A:** AI will democratize creativity by giving everyone access to professional-level tools.

**Perspective B:** AI threatens to devalue human creativity and eliminate jobs for artists and writers.
```

### The 5 Ws
**Purpose:** Structured factual breakdown
**Format:** Who, What, Where, When, Why
**Best for:** News stories, event coverage

**Output example:**
```
- **Who:** OpenAI researchers
- **What:** Released GPT-5 with improved reasoning
- **Where:** San Francisco headquarters
- **When:** January 2026
- **Why:** To advance AI capabilities for complex problem-solving
```

### Explain Like I'm 5
**Purpose:** Simplified explanation
**Format:** 2-3 friendly paragraphs
**Best for:** Technical content, complex topics

**Output example:**
```
Imagine your brain is like a big library full of books. AI is like a robot that can read ALL the books super fast and help you find the right answers when you ask questions.

Sometimes people worry the robot might take over the library. But really, the robot is just a helper that makes it easier for everyone to learn new things!
```

### Translated Overview
**Purpose:** Overview in another language
**Format:** One-liner + 3 bullets in target language
**Best for:** Language learning, international readers

**Options:**
- Language (20 supported languages)
- Level: beginner, intermediate, advanced (currently unused but available)

**Output example (Spanish):**
```
La inteligencia artificial está transformando el trabajo creativo.

- Las herramientas de IA automatizan tareas creativas rutinarias
- Preocupaciones sobre el desplazamiento laboral en campos creativos
- Nuevas oportunidades con creatividad asistida por IA
```

### People, Places & Things
**Purpose:** Entity extraction with context
**Format:** Categorized lists with descriptions
**Best for:** Articles with many named entities

**Output example:**
```
**People:**
- **Sam Altman:** CEO of OpenAI, announced the new model
- **Demis Hassabis:** Google DeepMind CEO, commented on competition

**Places:**
- **San Francisco:** Location of OpenAI headquarters
- **Silicon Valley:** Hub of AI development activity

**Things:**
- **GPT-5:** New language model with enhanced reasoning
- **API:** Programming interface for developers to access the model
```

### Arc-style Summary
**Purpose:** Detailed, fact-specific summary
**Format:** 4-7 bullet points with specifics
**Best for:** Long articles needing comprehensive summaries

**Characteristics:**
- Captures author's tone and perspective
- Includes specific details (prices, dates, numbers)
- Fact-filled and concrete
- No repetition
- Special handling for recipes and restaurants

**Output example:**
```
- OpenAI released GPT-5 on January 15, 2026, priced at $0.03/1K tokens for input
- The model shows 89% accuracy on mathematical reasoning benchmarks, up from 73% in GPT-4
- Available through API access with waitlist expected to clear by February 2026
- Key improvement areas include multi-step reasoning, code generation, and nuanced conversation
- Enterprise pricing starts at $2,000/month for dedicated capacity
```

---

## Translation Language Options

**File:** `package.json` (preferences)

### Supported Languages

20 languages are currently supported for Translated Overview:

| Language | Code | Flag |
|----------|------|------|
| Spanish | es-ES | 🇪🇸 |
| French | fr-FR | 🇫🇷 |
| German | de-DE | 🇩🇪 |
| Italian | it-IT | 🇮🇹 |
| Portuguese | pt-BR | 🇧🇷 |
| Japanese | ja-JP | 🇯🇵 |
| Chinese (Simplified) | zh-Hans | 🇨🇳 |
| Chinese (Traditional) | zh-Hant | 🇹🇼 |
| Korean | ko-KR | 🇰🇷 |
| Russian | ru-RU | 🇷🇺 |
| Arabic | ar-SA | 🇸🇦 |
| Hindi | hi-IN | 🇮🇳 |
| Dutch | nl-NL | 🇳🇱 |
| Polish | pl-PL | 🇵🇱 |
| Swedish | sv-SE | 🇸🇪 |
| Turkish | tr-TR | 🇹🇷 |
| Vietnamese | vi-VN | 🇻🇳 |
| Thai | th-TH | 🇹🇭 |
| Greek | el-GR | 🇬🇷 |
| Hebrew | he-IL | 🇮🇱 |

### Language Name Mapping

The prompt template maps locale codes to language names:

```typescript
const LANGUAGE_NAMES: Record<string, string> = {
  "es-ES": "Spanish",
  "fr-FR": "French",
  // ...
};
```

This ensures the AI receives clear instructions like "translate into Spanish" rather than "translate into es-ES".

### Adding New Languages

1. **Add to preferences** in `package.json`:
```json
{
  "name": "translationLanguage",
  "data": [
    { "title": "🇸🇦 Swahili", "value": "sw-KE" },
    // ...
  ]
}
```

2. **Add to language mapping** in `src/config/prompts.ts`:
```typescript
const LANGUAGE_NAMES: Record<string, string> = {
  "sw-KE": "Swahili",
  // ...
};
```

---

## Summary Caching

**File:** `src/utils/summaryCache.ts`

Summaries are cached in LocalStorage to avoid regenerating identical requests.

### Cache Key Structure

```typescript
`summary:${url}:${style}:${language || 'default'}`
```

**Examples:**
- `summary:https://example.com:overview:default`
- `summary:https://example.com:translated:es-ES`

### Cache Operations

```typescript
// Get cached summary
const cached = getCachedSummary(url, style, language);

// Save summary to cache
setCachedSummary(url, style, summary, language);
```

### Cache Behavior

- Summaries are cached indefinitely (LocalStorage persists)
- Changing the URL, style, or language triggers a new generation
- Cache is scoped to the extension (won't affect other apps)
- No automatic expiration (summaries assumed stable)

### Clearing Cache

To clear cached summaries manually:

```typescript
// In browser console or extension code
localStorage.removeItem('summary:https://example.com:overview:default');
```

Or clear all summaries:

```typescript
Object.keys(localStorage)
  .filter(key => key.startsWith('summary:'))
  .forEach(key => localStorage.removeItem(key));
```

---

## Performance Tuning

### Model Selection Trade-offs

| Model | Speed | Quality | Cost | Best For |
|-------|-------|---------|------|----------|
| GPT-5 nano | Very fast | Good | Low | Quick summaries, high volume |
| GPT-5 | Fast | Better | Medium | Balanced use cases |
| Claude Sonnet | Medium | High | Higher | Quality-critical summaries |
| Claude Opus | Slow | Highest | Highest | Maximum quality needed |

### Creativity Impact

- **Low creativity** = More consistent, factual, faster
- **High creativity** = More varied, interpretive, potentially slower

For most summary styles, **low creativity** is recommended to ensure consistent formatting and factual accuracy.

### Streaming Performance

The extension uses Raycast's `useAI` hook with streaming enabled:

- Summaries display progressively as they generate
- User sees partial results immediately
- No blocking wait for completion
- Final summary cached when done

**Metrics tracked:**
- Generation time (logged in milliseconds)
- Estimated tokens (length / 4)
- Success/failure status

---

## Testing Summaries

### Manual Testing

To test a summary style:

1. Open any article in Reader
2. Use action panel to select a summary style
3. Observe generation time and output format
4. Check logs (enable verbose logging in preferences)

### Prompt Iteration

When refining prompts:

1. Edit prompt in `src/config/prompts.ts`
2. Rebuild extension (`npm run dev`)
3. Clear cached summary for test URL
4. Generate new summary with updated prompt
5. Compare output against expected format

### AI Config Tuning

To test different models or creativity levels:

1. Edit config in `src/config/ai.ts`
2. Rebuild extension
3. Clear cache for test articles
4. Generate summaries and compare quality/speed
5. Check logs for generation time differences

---

## Related Documentation

- [Architecture](./architecture.md) — Overall system design
- [Prompts Source](../src/config/prompts.ts) — All prompt templates
- [AI Config Source](../src/config/ai.ts) — Model configuration
