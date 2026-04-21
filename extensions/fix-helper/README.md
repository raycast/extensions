# 💸 FIX Helper for Raycast

A powerful Financial Information eXchange (FIX) protocol parser. Quickly analyze single messages or entire logs with ease.

## ✨ Features

### 🧠 Smart Analysis
- **Smart Summary**: Instantly understand messages with human-readable descriptions (e.g., *"Filled: Buy 100 AAPL @ 150.00"*).
- **Repeating Groups**: Visual cues (🟣) make it easy to spot and navigate repeating groups like `NoMDEntries`.
- **Timestamps**: Automatically converts UTC tags (52, 60, 122) to your **Local Time**.

### 🚀 Pro Workflow
- **Focus on Order**: Right-click any message in the timeline to **Filter by Order ID** or **ClOrdID**, instantly tracing the entire lifecycle of an order.
- **Export Tools**: Easily export parsed messages as **JSON** or generate a **Text Summary** report.
- **Instant Launch**: Pass a FIX message via Raycast arguments to skip the input form and see results immediately.

### 🔍 Powerful Parsing
- **Auto-detect**: Instantly parses from **Clipboard** or **Selected Text** on launch.
- **Flexible Delimiters**: Supports standard delimiters (`<SOH>`, `\x01`) and custom ones (e.g., `|`, `^`, `~`).
- **Multi-Message Timeline**: Paste a log file to see a chronological view of all messages (`Sender -> Target`).

### 📚 Reference Tools
- **Tag Dictionary**: Search tags by number, name, or type.
- **Deep Details**: View all valid enum values, data types, and definitions.

## 🛠️ Usage

### 📥 Parsing
1.  **Auto-Parse**: Copy a FIX message and open the command. It detects and parses automatically.
2.  **Manual Input**: Paste raw FIX text into the input area.
3.  **Arguments**: Pass a message directly via Raycast arguments or deep links.

### 🧭 Navigation
- **Timeline**: Use the dropdown to filter by **Message Type** (e.g., show only "Rejects").
- **Drill Down**: Press `Enter` on any message to see its full field-by-field breakdown.
- **Search**: Type to filter fields by Tag, Name, or Value (e.g., "Price", "35=D").

## ⚙️ Preferences

- **Default Version**: Set your preferred FIX version (e.g., FIX 4.2, FIX 5.0).
- **Show Icons**: Toggle visual icons on/off for a cleaner or richer view.
- **Custom Delimiter**: Specify a custom string (e.g., `||`) to prioritize as a delimiter for unique log formats.

## 📜 License
MIT

## 👨‍💻 Development

### Generating FIX Specifications
The extension comes with pre-generated FIX specifications in `src/specs.ts`. If you need to regenerate them (e.g., to fetch updates or modify the parsing logic), use the provided script:

```bash
# Regenerate src/specs.ts
npx ts-node scripts/generate_specs.ts
```

This script will:
1.  Fetch the latest XML specifications from the QuickFIX repository.
2.  Parse tags, types, and enums.
3.  Apply overrides for better readability (e.g., MsgType descriptions).
4.  Generate a strongly-typed TypeScript file at `src/specs.ts`.