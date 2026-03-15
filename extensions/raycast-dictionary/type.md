# Raycast Dictionary Extension — Project Type & Design

## What It Is

A Raycast extension that acts as a personal English dictionary. Given a word or phrase, it queries an AI API and returns a structured, Cambridge-style definition with example sentences.

---

## Core User Flow

1. User opens Raycast and triggers the extension (via command or hotkey)
2. User types a word or phrase
3. Extension sends the word to an AI API
4. Response is displayed in a clean, structured format:
   - **Part of speech** (noun, verb, adjective, etc.)
   - **Pronunciation** (phonetic, if available)
   - **Definition(s)** — plain English explanations
   - **Example sentences** — 2–3 contextual examples
   - **Synonyms / Related words** (optional, nice to have)

---

## Extension Type

**Raycast Command Type:** `view` (renders a UI)

The extension will use the Raycast API's `Detail` component to show formatted markdown output — this gives a clean, readable dictionary card look.

Alternatively, a `List` command could show multiple definitions as list items.

**Decision:** Start with `Detail` view for a focused, readable single-word lookup. Can add `List` later for browsing history.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Runtime | Node.js (TypeScript) | Required by Raycast extensions |
| Framework | Raycast API | Official extension SDK |
| AI Backend | Anthropic Claude API | Fast, structured responses; easy to prompt |
| Package Manager | npm | Raycast default |
| Language | TypeScript | Type safety, Raycast SDK is typed |

---

## AI Prompt Design

The extension sends a carefully crafted prompt to get Cambridge-style output:

```
You are an English dictionary assistant. Given a word or phrase, respond in this exact format:

**[word]** /phonetic/
*part of speech*

**Definition:**
A clear, plain-English explanation of what the word means.

**Examples:**
1. Sentence using the word naturally.
2. Another example in a different context.
3. A third example if helpful.

**Synonyms:** word1, word2, word3

Keep definitions concise and accessible to non-native English speakers.
```

---

## Raycast API Components Used

- `Detail` — renders the AI response as formatted markdown
- `ActionPanel` + `Action.CopyToClipboard` — lets user copy the definition
- `Action.OpenInBrowser` — optional link to full dictionary
- `getPreferenceValues` — stores the API key securely in Raycast preferences
- `showToast` — feedback while loading
- `useNavigation` / `Form` — for the search input (if not using `arguments`)

---

## Extension Commands

| Command | Description |
|---|---|
| `Look Up Word` | Main command — takes a word as input and shows its definition |
| `History` *(v2)* | Shows recently looked-up words |

---

## Project Structure

```
raycast-dictionary/
├── src/
│   ├── look-up.tsx          # Main command — search + detail view
│   ├── api/
│   │   └── claude.ts        # AI API call logic
│   └── utils/
│       └── formatResponse.ts # Parse and format AI response
├── assets/
│   └── extension-icon.png
├── package.json
├── tsconfig.json
├── CLAUDE.md                # AI assistant instructions for this project
└── type.md                  # This file
```

---

## Phases

### Phase 1 — MVP
- Single command: look up a word
- Calls AI API, shows definition in `Detail` view
- API key stored in Raycast preferences
- Copy definition to clipboard

### Phase 2 — Polish
- Loading state with skeleton/toast
- Error handling (network issues, invalid word)
- Better formatting (icons, colors via markdown)
- Keyboard shortcuts

### Phase 3 — Features
- Search history (stored locally)
- Favorite words
- Optional: show word in multiple languages
