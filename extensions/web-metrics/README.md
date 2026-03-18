# Web Metrics — Raycast Extension

Quickly check any website's performance using the **Google PageSpeed Insights API v5**, right from Raycast.

## Features

- **Performance, Accessibility, Best Practices & SEO Scores** with color-coded indicators
- **Core Web Vitals**: FCP, LCP, CLS, TTFB, TTI, TBT, Speed Index, INP
- **Resource Breakdown**: request count and transfer size per resource type
- **Opportunities & Diagnostics**: top Lighthouse audit recommendations
- **Page Weight**: total requests, transfer size, DOM elements
- **Mobile vs Desktop** strategy toggle
- **URL History**: quick-access your last 5 tested URLs
- **Full Report Link**: one click to open `pagespeed.web.dev`

---

## Setup

### 1. Get a Google API Key

Follow these steps to get a **free** API key:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Navigate to **APIs & Services → Library**
4. Search for **"PageSpeed Insights API"** and click **Enable**
5. Go to **APIs & Services → Credentials**
6. Click **Create Credentials → API Key**
7. Copy the generated key

> **Tip:** You can optionally restrict the key so it can only call the PageSpeed Insights API. On the key's settings page under **API restrictions**, select "Restrict key" and choose only "PageSpeed Insights API". This is recommended for safety.

### 2. Install the Extension

```bash
# Clone or copy this project
cd "Web Metrics"

# Install dependencies
npm install

# Start development mode
npm run dev
```

### 3. Configure

When you first run the command in Raycast, it will prompt you to enter your **Google API Key**. This is stored securely in Raycast's encrypted preferences.

---

## API Key Safety

Your API key is sensitive. Here's what you need to know:

| Concern          | How It's Handled                                                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Storage**      | Your key is stored in Raycast's **encrypted preference store** (type: `password`). It is never written to disk in plain text.    |
| **Transmission** | The key is sent **only** to Google's `googleapis.com` endpoint over HTTPS. It is never sent anywhere else.                       |
| **Source Code**  | The key is **never** hardcoded in source code. It's read at runtime from Raycast preferences.                                    |
| **Sharing**      | If you share this extension with someone, they will need to provide **their own** API key. Your key stays local to your machine. |

### Changing or Removing Your API Key

You can change or remove your API key at any time:

- **From the extension**: Press `⌘ ⇧ ,` or use the **"Change API Key"** action in the action panel.
- **From Raycast Settings**: Go to **Raycast Settings → Extensions → Web Metrics → Preferences**.

To revoke a key entirely, go back to the [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials) and delete or regenerate the key.

---

## Usage

1. Open Raycast and search for **"Check Web Metrics"**
2. Enter a URL (e.g. `example.com` — `https://` is added automatically)
3. Choose **Mobile** or **Desktop** strategy
4. Press Enter to analyze
5. View your results — scores, Core Web Vitals, resources, and recommendations

### Actions in Results View

| Action               | Shortcut | Description                                              |
| -------------------- | -------- | -------------------------------------------------------- |
| **Test Another URL** | `↵`      | Go back to the input form                                |
| **Copy Summary**     | —        | Copies a summary to clipboard                            |
| **Change API Key**   | `⌘ ⇧ ,`  | Opens extension preferences to update or remove your key |

---

## Project Structure

```
src/
├── index.tsx                    # Main Raycast command (UI)
├── models/
│   └── Metrics.ts               # Data model with typed getters
├── services/
│   ├── PageSpeedService.ts      # Google API communication
│   └── HistoryService.ts        # LocalStorage-backed URL history
└── utils/
    └── Formatter.ts             # Static formatting helpers
```

## Architecture

- **OOP with Dependency Injection** — services are instantiated once and injected into the UI
- **Single Responsibility** — each class has one concern
- **No business logic in React** — all API/storage/formatting logic is delegated to service classes
- **TypeScript strict mode** — full type safety across the codebase

## API Reference

- Endpoint: `https://www.googleapis.com/pagespeedonline/v5/runPagespeed`
- [Official Documentation](https://developers.google.com/speed/docs/insights/v5/get-started)
