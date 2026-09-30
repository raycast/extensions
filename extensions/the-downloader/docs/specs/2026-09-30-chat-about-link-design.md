# Chat About Link — design

Status: approved in conversation on 2026-09-30, pending review of this document.
Branch: `claude/the-downloader-ai` (never `ext/the-downloader` until the AI work ships).

## Goal

Turn **Chat About Video** into **Chat About Link**: paste any supported link, the
extension gathers what it can about it, and you chat about it with the engine of
your choice. Version 1 understands three kinds of links:

| Kind  | Sites (examples)                                | Source tool         |
| ----- | ----------------------------------------------- | ------------------- |
| video | YouTube, TikTok, X, Vimeo, other yt-dlp sites   | yt-dlp (as today)   |
| post  | Instagram posts and reels, Reddit, Pinterest, … | gallery-dl metadata |
| page  | any other webpage or article                    | fetch + Readability |

Spotify is out of scope for v1 ("not supported yet").

Why a dedicated command when Raycast AI Chat's `@the-downloader` exists: it works
without Raycast Pro (Apple Intelligence, Ollama), handles long texts, links
timestamps, and keeps Recent Chats and saved conversations.

## Non-goals

- No image generation, no downloading of media for the chat (images are fetched
  only when image viewing is allowed, see below).
- No comments scraping, no Spotify, no PDFs in v1.
- No change to the download pipeline, installer or updater.

## 1. Structure

- Command `chat-link`, title **Chat About Link**, replaces `chat-video` (never
  shipped, so no migration). Optional `url` argument stays. Keywords: video,
  post, article, youtube, instagram, tiktok, summarize, transcript.
- `src/lib/link-context.ts` defines `LinkContext`, replacing `VideoContext`:
  - `url`, `kind: "video" | "post" | "page"`, `site`, `title`, `author?`,
    `publishedAt?`
  - `stats: { label: string; value: string }[]`, `description?`, `chapters?`
    (video only)
  - `body`: `{ type: "segments"; segments: TranscriptSegment[] }` (timed) or
    `{ type: "paragraphs"; paragraphs: string[] }`
  - `images?: string[]` (post image URLs), `note?` (why `body` is empty),
    `fetchedAt`, `video?` (raw yt-dlp metadata for Media Preview / formats)
- Providers in `src/lib/sources/`: `video.ts`, `post.ts`, `page.ts`, each
  exporting a pure mapper (tool output → `LinkContext`) plus a thin fetcher.
- `loadLinkContext(url, options)` routes with the existing `detectSource`:
  video → video provider, gallery → post provider, webpage → page provider,
  spotify → error "Spotify links aren't supported in chat yet."
- Cache as today (`Cache`, 6 h), keyed `kind|language|url`.
- Chat keys: videos keep `<extractor>:<id>` so existing saved chats still match;
  posts use `<gallery-dl category>:<id>`; pages use the normalized URL.
- Unchanged: engines, streaming/stop, the chat list layout.

## 2. Providers

**Video** — today's `fetchTranscriptSegments` + metadata, for every video site in
`VIDEO_DOMAINS`. Without captions the chat still works from title, description
and stats; the note reads "This video has no captions, so answers come from its
details." (replaces "No en subtitles found for this video").

**Post** — `gallery-dl -j <url>` (metadata only, no download) through
`runWithWatchdog`, with `--cookies-from-browser` when the Gallery: Cookies from
Browser preference is set. Maps caption/text, author and co-authors, date,
likes/score, comment count, hashtags, image count and image URLs. Verified: a
public Instagram post returns caption, co-authors, date and count without login.
A gallery-dl error record (`[-1, {error, message}]`) becomes a note with an
action; e.g. Reddit's "You've been blocked by network security" → "Reddit blocks
anonymous access. Set Gallery: Cookies from Browser in preferences." with **Open
Extension Preferences**.

**Page** — `fetch` with a 15 s timeout, `text/html` only, 5 MB cap. Title, site
name, author and date from OpenGraph / JSON-LD / `<title>`; main text from
Mozilla Readability on a `linkedom` document (two new pure-JS dependencies).
Under ~200 characters of text → note "Couldn't read this page's text (it may
need a login or JavaScript)." and chat from title/description only.

Loading and errors in the chat keep today's pattern: **Retry**, **Open Link**,
and **Open Extension Preferences** where it helps.

## 3. Chat screen

- **About This Video / Post / Page** item:
  - video: channel, duration, views/likes/comments, chapters (as today)
  - post: author(s), date, likes, comments, hashtags, image count, first image
  - page: site, author, date, reading time (words ÷ 200)
- Suggested questions per kind:
  - video: Summarize the video · What are the key points? · Make study notes
  - post: What is this post about? · Translate the caption · Explain the hashtags
  - page: Summarize this article · What are the key takeaways? · What's the author's argument?
- Actions: Copy Answer, Copy Conversation, Save Conversation as Markdown, **Copy
  Context for Any AI** (was Copy Video Context), **Save Text** (Save Transcript
  with Timestamps for videos), Reload, Clear Chat, Open Link. `[m:ss]` links
  only for videos.
- **Images** — preference **Chat: Look at Images** (dropdown): **Ask Each Time**
  (default), Always, Never. Applies only to a post with images and an engine that
  can see images:
  - Apple on-device: `fm respond --image <file>` (images saved to a temp folder
    first; flag to be verified once the model is available)
  - Ollama: only when `/api/show` lists `vision` in the model's capabilities
  - Raycast AI: never (the extension AI API takes text only)
    With Ask Each Time, the first question in such a chat asks "Let the AI look at
    this post's N images? It's slower." — **Allow** / **Text Only**, remembered for
    that chat. With a text-only engine there's no prompt; the About item notes
    "N images (this engine reads text only)".
- Entry points: ⌘⇧A **Chat About Link** from the Download form, Media Preview, the
  live download view and Download History, for any link (not only video). Start
  screen accepts any link; Recent Chats show a video/post/page icon.

## 4. Raycast AI Chat

- Tools: `download-video` (unchanged); `get-link-info` replaces `get-video-info`
  (details and stats for any link, no body); `read-link` replaces
  `extract-transcript` (details plus body: timestamped transcript, caption or
  article text).
- AI instructions: link `[m:ss]` timestamps only for videos; name the source
  ("the post's caption", "the article"); use `get-link-info` for "how is it
  doing", `read-link` for "summarize / what does it say".
- Skills: Summarize Video → **Summarize Link**; Video Study Notes → **Study
  Notes** (videos and articles); Video Performance → **Performance Check**
  (videos and posts).
- Evals: new tool names, plus one Instagram post and one article eval.

## 5. Testing and rollout

- TDD with recorded fixtures: yt-dlp video JSON, gallery-dl Instagram JSON, the
  Reddit block error, HTML (article, paywall, JS-only) → `LinkContext`; routing;
  prompts per kind (no timestamps for posts/pages); Ollama vision detection; the
  image-prompt decision (preference × engine × images); chat keys (old video keys
  still match); tool outputs.
- Live headless checks (temporary, never committed): YouTube, a TikTok or X
  video, an Instagram post, a news article, a JS-only page — with Ollama, and
  Apple once its model has downloaded.
- Guided UI pass in Raycast (the user clicks): the original checklist adapted per
  kind, the image prompt, light/dark, 2–4 store screenshots of Chat About Link.
- Small commits on `claude/the-downloader-ai`; before every push: `npm run
build`, `npx tsc --noEmit`, `npx eslint src tests`, `npx prettier --check` on
  changed files, `npx vitest run`.
- This `docs/` folder is removed before the AI work goes to the Store.

## Findings this design builds on (2026-09-30, macOS 27.0.1)

- `fm` has one model (`system`, on-device); `--model pcc` is rejected, so the
  Private Cloud engine was removed (`ed7a8777`).
- Ollama `llama3.2`: streaming, stop and errors work; a 1 h 56 min video summary
  took 8 parts and ~8.5 min on a MacBook Air.
- Transcripts: English, German (`de`), Czech (`cs-orig`, ignoring the
  `live_chat` pseudo-track) and no-caption videos all load.
