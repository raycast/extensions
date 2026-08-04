# 🃏 Flashcards – Raycast Extension

Create, organize, and study flashcards directly within Raycast using an intuitive Markdown-based syntax.

[![Raycast API](https://img.shields.io/badge/Raycast%20API-v1.70.0+-red.svg)](https://raycast.com)
[![Platforms](https://img.shields.io/badge/Platforms-macOS%20%7C%20Windows-blue.svg)](#features)

---

## ✨ Features

- 🃏 **Create Flashcards:** Write and structure cards using a simple, human-readable Markdown format.
- 📋 **Browse & Manage:** Search, edit, and delete your existing cards in a responsive list view.
- 🏷️ **Tag-based Organization:** Group flashcards by topic to filter and study specific subjects.
- 🧠 **4 Interactive Quiz Modes:** Study all cards, only incorrect ones, new cards, or filter by specific tags.
- 📥 **Flexible Import:** Paste Markdown syntax directly or load `.md` files from your filesystem.
- 📤 **Seamless Export:** Back up your flashcard collection to `~/Downloads` (or `~/Desktop` as a fallback) or copy it to your clipboard.
- 💾 **100% Local Storage:** Everything is stored locally on your machine for maximum privacy.

---

## 💻 Commands

| Command    | Icon | Description                                                                |
| :--------- | :--: | :------------------------------------------------------------------------- |
| **Create** |  📝  | Create a new Q&A or Multiple-Choice flashcard using Markdown.              |
| **List**   |  🔍  | Browse, edit, delete, and search through your entire flashcard library.    |
| **Tags**   |  🏷️  | View all defined tags and instantly see the number of cards assigned.      |
| **Quiz**   |  🧠  | Start an interactive study session with detailed progress tracking.        |
| **Import** |  📥  | Import flashcards from a `.md` file or by pasting raw Markdown.            |
| **Export** |  📤  | Export all your flashcards as a single Markdown file or to your clipboard. |

---

## 📝 Markdown Syntax

### 1. Standard Q&A Card

```text
Capital of France
==
Paris
#geography #europe
```

1. Write the **question or term** on the first line.
2. Put `==` on a new line (this acts as the separator between front and back).
3. Write the **answer or definition**.
4. _(Optional)_ Add tags on the last line (e.g. `#geography #europe`).

---

### 2. Multiple-Choice Card

```text
Which language is spoken in Brazil?
==<
1: Spanish
2: Portuguese
3: French
--
true: 2
#languages
```

1. Write the **question** on the first line.
2. Put `==<` on a new line (this acts as the multiple-choice separator).
3. List the options in the format `1: Option A`, `2: Option B`, etc.
4. Put `--` on a new line.
5. Specify the correct option using `correct: 2`.
6. _(Optional)_ Add tags on the last line.

---

## 🧠 Quiz Modes & Controls

Customize your learning experience with four specialized modes:

- **Wrong cards:** Focus purely on cards you previously answered incorrectly.
- **New cards:** Review cards you haven't studied yet.
- **By tags:** Pick one or more tags to study a specific topic.
- **All cards:** Go through your entire collection in a randomized order.

### Keyboard Controls

#### Standard Card Quiz

- **`↵ Enter`**: Reveal the answer (flip the card).
- **`→` (Right Arrow)**: Mark the card as **Correct** (known).
- **`←` (Left Arrow)**: Mark the card as **Incorrect** (requires review).

#### Multiple-Choice Quiz

- **`1` – `9`** or **Select Option**: Select and submit your answer.
- **`↵ Enter`**: Proceed to the next card.

---

## 🔄 Import & Export Format

You can back up, share, or import large batches of cards. Multiple cards are separated by three dashes `---` on an empty line:

```markdown
Capital of France
==

Paris
#geography

---

Which language is spoken in Brazil?
==<
1: Spanish
2: Portuguese
3: French
--

true: 2
#languages
```

---

## 🔒 Storage & Privacy

All flashcards and learning statistics are stored locally in Raycast's secure `LocalStorage`.

- No cloud sync
- No third-party servers
- 100% offline-ready

Your data stays entirely on your machine.

---
