# Dictionary & Thesaurus (Raycast Extension)

A comprehensive, lightning-fast, offline-first English dictionary, reverse concept search, Roget's Thesaurus, and vector semantic synonym engine for Raycast.

---

## ✨ Features

- **Multi-Engine Hybrid Dictionary**:
  - **100% Offline Capable**: Bundles WordNet 3.1 and LibreOffice MyThes (~140,000+ words). Look up definitions, parts of speech, and synonyms instantly without an internet connection.
  - **Online Dynamic Enrichment**: When connected, automatically enriches entries with IPA phonetic notation, syllable counts, and Datamuse semantic rankings.
  - **macOS Native Oxford Bridge**: On macOS, automatically taps into Apple's built-in *New Oxford American Dictionary* and *Oxford American Writer's Thesaurus* via system services.
  - **Local Persistent Cache**: Every looked-up term is cached for instant offline recall.
- **Background Audio Pronunciation**:
  - Click on the phonetic text or press `Cmd + P` to hear words pronounced using native speech synthesis (`say` on macOS, `System.Speech` on Windows).
  - Runs silently in the background with zero browser tabs or pop-up windows.
- **Vector-Database Semantic Synonym Search (`vec`)**:
  - Enter multi-word descriptive queries (e.g. `"brave courageous knight"`, `"dark gloomy stormy"`, `"dramatic discovery"`, `"smell of rain"`).
  - Ranks words by cosine similarity in semantic vector space.
  - Frequency calibration elevates rare literary and technical gems (*anagnorisis*, *petrichor*, *eucatastrophe*, *peripeteia*, *aporia*) so they aren't drowned out by everyday words.
  - Top 3 vector matches are also highlighted in **green badges** at the head of the synonyms list in definitions.
- **Reverse Definition & Concept Search (`wrd`)**:
  - Find words by describing what you mean or typing definition fragments (e.g. `"to put forward"` → *proponent*, *offer*, *propound*; `"fear of spiders"` → *arachnophobia*).
- **Roget's Thesaurus 1911 Edition (`roget`)**:
  - Full catalog of all **1,000 thematic categories** from rrthesaurus.com.
  - Jump directly by category number (e.g. `861` for Courage) or search by keyword.
  - Consecutive entry navigation with arrow keys or links (`← 860. Fear` | `862. Cowardice →`).
- **Modern Rounded Badge Chips & 2D Grid Arrow Navigation**:
  - Synonyms and antonyms are formatted in clean, modern rounded box chips (`rx=5`) with crisp white text.
  - True 2D grid arrow navigation: `←` / `→` moves horizontally, while `↓` / `↑` moves up or down a single line to the exact corresponding column.
  - Press `↵ Enter` on any selected badge to jump directly into its full definition.

---

## ⚡ Commands

| Command | Alias | Mode | Description |
| :--- | :--- | :--- | :--- |
| **Define Word** | `def` | `view` | Word meanings, type chips, pronunciation, top 3 green vector synonyms, standard synonyms & antonyms. |
| **Vector Synonym Search** | `vec` | `view` | Multi-word semantic closeness search with niche vocabulary elevation. |
| **Reverse Dictionary** | `wrd` | `view` | Reverse concept search: type a phrase or meaning to find matching words. |
| **Roget's Thesaurus** | `rr` | `view` | Browse and search all 1,000 categories of Roget's Thesaurus 1911 Edition. |
| **Pronounce Word** | — | `no-view` | Silent background audio pronunciation. |

---

## ⚙️ Preferences

You can configure the extension in Raycast Preferences (`Cmd + ,`):
- **Offline Mode** (`offlineOnly`): Forces the extension to rely exclusively on the local offline database and cache, disabling all external network calls.
- **macOS Oxford Dictionary** (`preferOxford`): When running on macOS, prioritizes Apple's built-in Oxford Dictionary.

---

## 📜 License

MIT License. See [LICENSE](LICENSE) for details.
