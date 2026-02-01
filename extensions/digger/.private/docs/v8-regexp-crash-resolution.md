# V8 RegExpCompiler Crash Resolution

**Date**: January 5, 2026
**Status**: Resolved

## Problem Summary

The Raycast Digger extension was crashing silently when fetching certain websites, specifically `dribbble.com` (consistent) and `granola.ai` (intermittent). The error was:

```text
FATAL ERROR: RegExpCompiler Allocation failed - process out of memory
```

## Root Cause

The crash was caused by **Raycast's memory-constrained V8 worker hitting its heap limit during internal Node.js decompression operations**.

### Key Findings

1. **The crash occurred inside Node.js internals**, during `response.text()` or `reader.read()`, not in application code
2. **Memory usage at crash was only ~40MB** - well below typical Node.js heap limits
3. **The same code worked in standalone Node.js v25** but crashed in Raycast's bundled Node.js v22.14.0
4. **The "RegExpCompiler" error was misleading** - V8 uses regex internally during text processing/decompression

### Technical Explanation

Raycast runs extensions in isolated V8 worker threads with constrained memory limits. According to [Raycast's architecture documentation](https://www.raycast.com/blog/how-raycast-api-extensions-work):

> "A worker can crash or run out of memory; we catch this and show an error screen for the extension but Raycast itself is largely unimpressed by that."

When Node.js receives a gzip-compressed HTTP response, it internally decompresses the content. This decompression path in V8 involves regex operations for content-type parsing and encoding detection. For certain responses, this can cause V8 to attempt memory allocations that exceed Raycast's worker heap limit.

The crash was not about the regex in our code - it was about V8's internal regex operations during the decompression pipeline hitting the memory ceiling.

### Evidence

| Test | Result |
| ---- | ------ |
| Standalone Node.js v25 fetching dribbble.com | Success |
| Raycast extension fetching dribbble.com | Crash |
| Compressed response size (dribbble.com) | ~59KB |
| Uncompressed response size (dribbble.com) | ~382KB |
| Decompression ratio | 6.5x |
| Memory at crash | ~40-45MB |

## Solution

Added `Accept-Encoding: identity` header to all fetch requests in `src/utils/fetcher.ts`.

```typescript
const response = await fetch(url, {
  signal: controller.signal,
  redirect: "follow",
  headers: {
    // Disable compression to avoid V8 RegExpCompiler crashes in Raycast's
    // memory-constrained worker. The decompression code path in Node.js
    // can trigger V8 memory allocation failures on certain sites.
    "Accept-Encoding": "identity",
  },
});
```

### Why This Works

1. **Bypasses Node.js's internal decompression** - the code path that was crashing
2. **Avoids memory spikes** - decompression requires allocating buffers for both compressed and uncompressed data simultaneously
3. **Trades bandwidth for stability** - uncompressed responses are larger but process more predictably within memory constraints

### Tradeoffs

| Aspect | Before (with compression) | After (no compression) |
| ------ | -------------------------- | ------------------------ |
| Network transfer | ~59KB | ~382KB |
| Memory stability | Crashes on some sites | Stable |
| Decompression overhead | Yes | None |

The increased bandwidth is acceptable because:

- Digger primarily extracts `<head>` content (typically <50KB)
- Modern networks easily handle the difference
- Stability is more important than bandwidth optimization for a local tool

## Related Issues

This is a known class of issues affecting Raycast extensions:

- [Todoist extension crashes due to memory limit](https://github.com/raycast/extensions/issues/16487)
- [Slack extension memory limit](https://github.com/raycast/extensions/issues/16653)
- [Obsidian extension heap out of memory](https://github.com/marcjulianschwarz/obsidian-raycast/issues/93)
- [Jest RegExpCompiler crash (similar V8 issue)](https://github.com/jestjs/jest/issues/14445)

## Approaches That Did Not Work

These approaches were tried before finding the solution:

1. **AbortController for React double-invoke** - Helped with race conditions but didn't fix the crash
2. **Removing `toLowerCase()` calls** - No improvement
3. **Switching from streaming to `response.text()`** - Crash still occurred
4. **Try-catch around operations** - V8 fatal errors cannot be caught in JavaScript

See `v8-regexp-crash-investigation.md` for detailed documentation of the investigation process.

## Additional Fix: Streaming with Size Limit (January 8, 2026)

Disabling compression alone was insufficient for very large pages. Sites like `cnn.com` (1.97MB uncompressed) caused the same memory exhaustion via a different path—`response.text()` still loaded the entire response into memory before truncation.

### Problem

```text
Error: Worker terminated due to reaching memory limit: JS heap out of memory
```

The log showed:

```text
[fetcher] fetchHeadOnly:complete { url: 'https://cnn.com', truncated: true, htmlLength: 1978407 }
```

Despite `truncated: true`, the full 1.97MB was already in memory.

### Streaming Solution

Replaced `response.text()` with streaming that stops after `MAX_HEAD_BYTES` (512KB):

```typescript
const reader = response.body?.getReader();
const chunks: string[] = [];
let totalBytes = 0;

while (totalBytes < LIMITS.MAX_HEAD_BYTES) {
  const { done, value } = await reader.read();
  if (done) break;
  chunks.push(decoder.decode(value, { stream: true }));
  totalBytes += value.byteLength;
}

reader.cancel(); // Stop downloading
```

### Two-Layer Defense

| Layer | Fix | Protects Against |
| ----- | --- | ------------------ |
| 1. Disable compression | `Accept-Encoding: identity` | V8 decompression memory spikes |
| 2. Stream with limit | Read max 512KB, cancel stream | Large uncompressed responses |

Both layers are necessary to stay within Raycast's worker memory constraints.

## Verification

After applying the fix:

- `dribbble.com` loads successfully
- `granola.ai` loads successfully
- `cnn.com` loads successfully (previously crashed with 1.97MB response)
- No regression on other sites
