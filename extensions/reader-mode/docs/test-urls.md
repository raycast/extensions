# Parser Test URLs

> Test fixtures for comparing Readability vs Defuddle content extraction.

## How to Test

1. Set **Content Parser** preference to "Readability (Stable)"
2. Open each URL and note: title, content length, images, formatting
3. Switch to "Defuddle (Experimental)"
4. Repeat and compare results
5. Document issues in the comparison table below

---

## News Sites

| Site | Test URL | Readability | Defuddle | Notes |
|------|----------|-------------|----------|-------|
| CNN | https://www.cnn.com/2025/12/30/tech/how-ai-changed-world-predictions-2026-vis | | | |
| CNN | https://www.cnn.com/2025/12/15/tech/government-tech-force-ai | | | |
| CNBC | https://www.cnbc.com/2026/01/02/chipmakers-2026-ai-trade.html | | | |
| Reuters | https://www.reuters.com/technology/artificial-intelligence/ | | | |
| Yahoo Finance | https://finance.yahoo.com/video/ces-2026-expect-nvidia-ceo-150138967.html | | | Video content |

---

## Tech Sites

| Site | Test URL | Readability | Defuddle | Notes |
|------|----------|-------------|----------|-------|
| TechCrunch | https://techcrunch.com/2026/01/03/california-residents-can-use-new-tool-to-demand-brokers-delete-their-personal-data/ | | | |
| TechCrunch | https://techcrunch.com/2026/01/03/tech-billionaires-cashed-out-16-billion-in-2025-as-stocks-soared/ | | | |
| TechCrunch | https://techcrunch.com/2026/01/02/in-2026-ai-will-move-from-hype-to-pragmatism/ | | | |
| Engadget | https://www.engadget.com/big-tech/ces-2026-what-to-expect-from-techs-big-january-conference-120000956.html | | | |
| Engadget | https://www.engadget.com/mobile/smartphones/clicks-is-bringing-its-first-smartphone-and-a-new-keyboard-to-ces-2026-182239003.html | | | |
| Engadget | https://www.engadget.com/home/home-theater/lg-to-unveil-a-canvas-style-tv-at-ces-2026-010024691.html | | | |
| IEEE Spectrum | https://spectrum.ieee.org/amp/tech-in-2026-2674813878 | | | |
| TechRadar | https://www.techradar.com/tech/the-biggest-tech-trends-to-expect-in-2026 | | | |

---

## Blog Platforms

| Site | Test URL | Readability | Defuddle | Notes |
|------|----------|-------------|----------|-------|
| Medium | https://medium.com/@ako74programmer/ai-in-2025-the-year-that-changed-everything-what-awaits-us-in-2026-a78a7cc00d89 | | | |
| Medium | https://grantpiperwriting.medium.com/here-is-what-to-look-forward-to-in-2026-dea5ffea47f1 | | | |
| Substack | https://www.understandingai.org/p/17-predictions-for-ai-in-2026 | | | |
| Personal Blog | https://www.allthingsdistributed.com/2025/11/tech-predictions-for-2026-and-beyond.html | | | Werner Vogels |
| BBC Science Focus | https://www.sciencefocus.com/future-technology/hidden-forces-ai-bubble | | | |

---

## Reference Sites

| Site | Test URL | Readability | Defuddle | Notes |
|------|----------|-------------|----------|-------|
| Wikipedia | https://en.wikipedia.org/wiki/ChatGPT | | | Complex structure |
| Stack Overflow | https://stackoverflow.com/questions/77641928/how-to-use-chatgpt-api-in-python | | | Q&A format |
| GitHub README | https://github.com/kepano/defuddle | | | Markdown |
| GitHub Discussions | https://github.com/raycast/extensions/discussions/15000 | | | |

---

## Social/Community

| Site | Test URL | Readability | Defuddle | Notes |
|------|----------|-------------|----------|-------|
| Reddit | https://www.reddit.com/r/ChatGPT/comments/1hqjz8k/openai_o1_is_now_available_in_chatgpt/ | | | Has Defuddle extractor |
| Hacker News | https://news.ycombinator.com/item?id=42541744 | | | Has Defuddle extractor |

---

## Edge Cases

| Scenario | Test URL | Readability | Defuddle | Notes |
|----------|----------|-------------|----------|-------|
| Heavy JS/SPA | https://www.notion.so/blog | | | May need browser extension |
| Lazy images | https://www.buzzfeed.com/tech | | | Test image resolution |
| Paywalled | https://www.wsj.com/tech/ai/openai-chatgpt-orion-model-69f96f19 | | | Test paywall detection |
| Non-article | https://www.google.com | | | Should fail gracefully |
| Empty page | https://example.com | | | Should fail gracefully |
| Long article | https://www.newyorker.com/magazine/2023/11/20/a-coder-considers-the-waning-days-of-the-craft | | | Test performance |

---

## Comparison Summary

After testing, summarize findings:

### Sites Where Defuddle Wins
- (List sites with better extraction)

### Sites Where Readability Wins
- (List sites with better extraction)

### Sites Needing Custom Extractors
- (List sites that fail with both)

### Sites Needing removeSelectors
- (List sites with extra clutter)

---

## Test Metrics

For each URL, evaluate:

1. **Title Extraction** - Correct? Complete?
2. **Byline/Author** - Extracted correctly?
3. **Content Completeness** - All paragraphs present?
4. **Image Preservation** - Images included? Lazy-loaded resolved?
5. **Link Functionality** - Relative URLs converted to absolute?
6. **Clutter Removed** - Ads, nav, footer removed?
7. **Formatting** - Headings, lists, code blocks correct?
8. **Markdown Quality** - Clean, readable output?
9. **Parse Time** - Fast enough?

---

## Notes

- Replace placeholder URLs with actual articles before testing
- Some sites may require authentication or have paywalls
- Test with verbose logging enabled to see parser details
- Document any crashes or errors in the Notes column
