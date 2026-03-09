# 🎬 GIF Markdown — Raycast Extension

Search Giphy and instantly paste GIF markdown into any text input — GitHub PRs, issues, Notion, Linear, and more.

## Setup

### 1. Get a Giphy API Key (free)

1. Go to [developers.giphy.com](https://developers.giphy.com)
2. Log in / create an account
3. Click **Create an App** → choose **API** (not SDK)
4. Fill in app name + description → your key will be shown immediately

### 2. Install the extension

```bash
# Clone or copy this folder into your Raycast extensions directory
cd ~/path/to/gif-for-github

# Install dependencies
npm install
#This registers the extension
npm run dev 
```

### 3. Configure preferences

Open Raycast → search **"Search GIF for GitHub"** → `⌘ ,` to open preferences:

| Preference | Description |
|---|---|
| **Giphy API Key** | Your API key from step 1 |
| **Markdown Style** | `![alt](url)` / `<img>` tag / URL only |
| **HTML Width** | Width for `<img>` tags (default: 400px) |

## Usage

1. Open a GitHub PR / issue comment box (or any text input)
2. Trigger Raycast → type **"gif"** → open **Search GIF for GitHub**
3. Type to search (shows trending GIFs when empty)
4. Press **↵ Enter** to paste directly into your active app
   - `⌘C` — Copy markdown to clipboard instead
   - `⌘⇧C` — Copy raw URL
   - `⌘O` — Open on Giphy

## Output examples

**Image (default)**
```markdown
![success kid](https://media.giphy.com/media/xxxxx/giphy.gif)
```

**HTML tag**
```html
<img src="https://media.giphy.com/media/xxxxx/giphy.gif" width="400" alt="success kid" />
```

**URL only**
```
https://media.giphy.com/media/xxxxx/giphy.gif
```
