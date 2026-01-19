# Reader Raycast Extension

> **Purpose:** Rapid prototype sketch for Claude Opus 4.5 implementation
> **Instructions:** Fill in sections below. Use `[TBD]` for unknowns—Claude will clarify or research.

---

## 1. Core Idea

**Extension Name:** `Reader`

**One-liner:** _Reader makes it easy to read web content in a clean interface, like Safari's Reader Mode._

**Problem it solves:** _Webpages are covered in pop-overs, adverts, and other distractions. Reader helps you read without distraction right in Raycast._

**Inspiration / prior art:** _[Dark Reader](https://darkreader.org/), Mozilla's [Readability](https://github.com/mozilla/readability), Safari Web Reader, [Jina Reader](https://jina.ai/reader/), [Article Summarizer](https://github.com/sawyerh/article-summarizer/tree/main), [Reader View](https://github.com/rNeomy/reader-view),_ Mercury/Postlight Reader ([source](github.com/postlight/parser)), [Webpage to Markdown](https://www.raycast.com/treyg/webpage-to-markdown) ([source](https://github.com/raycast/extensions/tree/1cf953d3b35e16d134c11763a04256bb9911b0f5/extensions/webpage-to-markdown/))

---

## 2. Data & Integrations

### Primary Data Source

| **Field**      | **Value**                                                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Type           | `[ ] API`<br/>`[ ] Local files`<br/>`[X] Clipboard`<br/>`[ ] System`<br/>`[X] Selected Text`<br/>`[X] Browser`<br/>`[X] Other: user-supplied URL` |
| API/Service    | N/A unless using a remote Markdown service like [Jina](https://jina.ai/reader/)                                                                   |
| Auth required? | `[X] None` <br/>`[ ] API Key` <br/>`[ ] OAuth` <br/>`[ ] Other: ___`                                                                              |
| Rate limits?   | N/A unless using a remote Markdown service like [Jina](https://jina.ai/reader/)                                                                   |

### Secondary Sources (optional)

Let's start with [html-to-markdown](https://github.com/Goldziher/html-to-markdown) and see how good and speedy the rendering is.

I would like to offer a preference to enable summarization at the top of the page (similar to _[Article Summarizer](https://github.com/sawyerh/article-summarizer/tree/main)_, but using a call to Raycast AI).

---

## 3. Commands

### Command: `[Open Reader] [URL]`

- **Trigger:** _User types `reader` or something like it into Raycast with a URL as the required argument_
- **Input:** _The user types or pastes a URL, or we use the selected text, or we get the current tab from the Raycast Browser Extension._
- **Output:** _We render a Detail view with cleaned the title of the article set in h1, and then a blocked AI-summary, and then display just the essential content of the webpage — no ads, sidebars, footers, headers, or any other irrelevant information._
- **Key actions:** _Copy as Markdown (primary action), Copy Summary, The user can Open the URL, Copy the URL_

---

## 4. UI Sketch

_Quick visual metaphor or wireframe description. Be loose—this is a napkin sketch._

![webpage-to-markdown 2025-12-27 at 22.08.28.png](https://resv2.craft.do/user/full/a5e6a4bd-0794-266d-e54e-5b99edfcc562/doc/F5D499EE-FC9B-4C35-B0DB-ABA294F89472/B2EB91FF-C45A-44CA-B97B-6CE09B16CD03_2/73XGxWbqEee9igpS3MYGHKZl0RLQ5OpSHrOOvzZBh0oz/webpage-to-markdown%202025-12-27%20at%2022.08.28.png)

This is the Webpage to Markdown extension.

It's pretty close to what I want, but I don't want the sidebar, and I want the content to be much significantly cleaner — no advertising content, etc.

I want an AI summary (One line + three bullets) at the top. I like the idea of letting people choose different [summary styles](https://intercom.help/particlenews/en/articles/10094099-particle-stories#h_fa2e60fd2e) like Particle News:

## **Overview**

This is the default style—a bullet point list of the key information you need to know about the story.

## **Opposite Sides**

This style pulls two different viewpoints from the story and explains their respective points of view.

## **The 5 Ws**

A classic—the who, what, where, when, and why of a story, keeping it to the most important details.

## **Explain Like I’m 5**

This style simplifies the language and explains the story in a straightforward way. It’s super useful for complex topics like quantum physics, or Supreme Court cases (the Court did not uphold the stay on the ban… so wait… what happened?)

## **Translated Overview**

Get the bullet point overview in a different language, and choose between three language levels: Beginner and Advanced.

## **People, Places, & Things**

In Particle, you can follow anything. Tap a highlighted word to find out more about it, including some background information from Wikipedia, how it relates to the story you are reading, related stories, and more.

---

## 5. Preferences & Settings

| **Preference**  | **Type** | **Default** | **Notes**                                                                                                      |
| --------------- | -------- | ----------- | -------------------------------------------------------------------------------------------------------------- |
| Show Summary    | boolean  | Yes         | Required                                                                                                       |
| Summary Style   | dropdown | list        | Options: Overview, Opposite Sides, The 5 Ws, Explain Like I’m 5, Translated Overview, People, Places, & Things |
| Verbose logging | checkbox | false       | Uses @chrismessina/raycast-logger                                                                              |

---

## 6. Node Modules & Libraries

### Always Include

- `@chrismessina/raycast-logger` — Structured logging with user toggle

### Suggested for This Extension

_Claude should research and suggest packages. Seed ideas here:_

- `[html-to-markdown]` — _markdown parsing_
- `[Mozilla's Readability`, `Postlight Reader]` — _webpage cleaning_

### Research Prompts for Claude

> Before implementing, search for:

- > npm packages for `"markdown parsing"`, `"html-to-markdown"`
- > Raycast Store for similar extensions: `markdown`, `reader`, `rss`, `feed reader`
- > Open source repos that solve `[Article Summarization]`, Markdown parsing (e.g. [Turndown](https://github.com/mixmark-io/turndown))

---

## 7. Edge Cases & Concerns

_Things Claude should handle or ask about:_

❌ Offline behavior?

❌ Empty states / no results?

✅ Error handling for web access failures?

e.g. Failed to fetch markdown: Unavailable For Legal Reasons

e.g. URL not public

✅ Markdown rendering limitations in Raycast

❌ Large result sets / pagination?

❌ Caching strategy?

✅ Other: Server rejection or robots.txt rejection

---

## 8. Nice-to-Haves (v2+)

_We should be able to get pretty far shimming together existing open source projects, so it's definitely out of scope for v1 to create our own parser or content scraper._

---

## 9. Open Questions

_It may be possible to ask Raycast AI to extract the content from a webpage and then we just need to convert it into Markdown, unless Raycast AI already doesn't that for us. We should see if that's possible first before building our own scraper, cleaner, and converter!_

---

## Implementation Notes for Claude

When implementing this extension:

1. **Research first:** Search Raycast Store for similar extensions. Check npm for relevant packages.
2. **Scaffold exists:** Extension created via Raycast. Add source files to `src/`.
3. **Logging:** Integrate `@chrismessina/raycast-logger` per standard pattern (see logging guide if available in docs/).
4. **Iterate with me:** If spec is ambiguous, propose options rather than guessing.
5. **Prototype mindset:** Prioritize working code over polish. We'll refine together.

## Test Links

1. [OpenAI CEO Sam Altman Just Publicly Admitted That AI Agents Are Becoming a Problem](https://timesofindia.indiatimes.com/technology/tech-news/openai-ceo-sam-altman-just-publicly-admitted-that-ai-agents-are-becoming-a-problem-says-ai-models-are-beginning-to-find-/articleshow/126215397.cms#origin=https%3A%2F%2Fwww.google.com%2F&cap=swipe,education&webview=1&dialog=1&viewport=natural&visibilityState=prerender&prerenderSize=1&viewerUrl=https%3A%2F%2Fwww.google.com%2Famp%2Fs%2Ftimesofindia-indiatimes-com.cdn.ampproject.org%2Fc%2Fs%2Ftimesofindia.indiatimes.com%2Ftechnology%2Ftech-news%2Fopenai-ceo-sam-altman-just-publicly-admitted-that-ai-agents-are-becoming-a-problem-says-ai-models-are-beginning-to-find-%2Farticleshow%2F126215397.cms%3Fusqp=mq331AQIUAKwASCAAgM%25253D&amp_kit=1)
2. [The No Network Effect](https://snarfed.org/2013-04-13_the-no-network-effect)
3. [AI agents are becoming a problem, Sam Altman says](https://www.theverge.com/2025/10/15/24927849/ai-agents-are-becoming-a-problem-sam-altman-openai-ceo-interview)
