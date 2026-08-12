# V8 RegExpCompiler Crash Investigation

**Date**: January 5, 2026
**Status**: Unresolved

## Problem Description

The Raycast extension crashes silently when fetching certain websites, specifically:

- `dribbble.com` (consistent crash)
- `granola.ai` (intermittent crash)

### Error Message

```text
Node terminated
  Termination Reason: uncaughtSignal
  Status: 6

<--- Last few GCs --->
[42364:0xabe000000] 139 ms: Scavenge 47.0 (56.7) -> 40.8 (58.5) MB...
[42364:0xabe000000] 181 ms: Mark-Compact 45.6 (59.0) -> 40.4 (58.5) MB...

<--- JS stacktrace --->
FATAL ERROR: RegExpCompiler Allocation failed - process out of memory
```

### Environment

- **Raycast Node.js version**: 22.14.0
- **Memory at crash**: ~40-45 MB (not excessive)
- **Crash location**: During `await reader.read()` or `await response.text()`

## Approaches Tried (All Failed)

### 1. AbortController for React Double-Invoke

**Rationale**: React StrictMode double-invokes effects, potentially causing race conditions.

**Changes**:

- Added `useRef<AbortController>` to track and cancel previous fetches
- Added early abort checks before starting fetch operations

**Result**: Partially worked. Fixed some race conditions, but dribbble.com still crashes.

### 2. Removed `toLowerCase()` Calls

**Rationale**: `toLowerCase()` on large strings might trigger V8 memory issues.

**Changes**:

- Replaced `accumulated.toLowerCase().indexOf("</head>")` with explicit case-variant searches
- Now searches for `</head>`, `</HEAD>`, and `</Head>` separately

**Result**: No improvement. Crash still occurs.

### 3. Granular Logging in Streaming Loop

**Rationale**: Identify exact crash location within the streaming code.

**Changes**:

- Added logs before/after `reader.read()`, `decoder.decode()`, string concatenation, and `indexOf`

**Result**: Confirmed crash happens during `await reader.read()` - after `chunk-start` log, before `chunk-read` log. This is a Node.js internal operation.

### 4. Replaced Streaming with `response.text()`

**Rationale**: Avoid streaming entirely; fetch full response as text.

**Changes**:

- Replaced `reader.read()` loop with single `await response.text()` call
- Extract `<head>` section after receiving full response

**Result**: Same crash occurs during `await response.text()`. The issue is not specific to streaming.

### 5. Try-Catch Around Operations

**Rationale**: Catch and handle the error gracefully.

**Result**: V8 fatal errors cannot be caught with try-catch. This is a process-level crash.

## Key Observations

| Observation | Implication |
| ----------- | ----------- |
| Crash is V8 fatal error, not JS exception | Cannot be caught or handled in JavaScript |
| Error mentions "RegExpCompiler" | V8 is compiling a regex internally somewhere |
| Crash happens in Node.js internals | Not directly in our code |
| Memory usage is ~40MB at crash | Not a simple memory exhaustion |
| dribbble.com `</head>` at ~14KB | Well within our 512KB limit |
| granola.ai crashes intermittently | Suggests timing/race condition component |
| cnn.com works (524KB fetched) | Large responses can work fine |

## Theories

### Theory 1: Compression Decompression Bug

Node.js automatically decompresses gzip/brotli responses. The decompression code may use regex internally, and certain compressed payloads could trigger pathological regex behavior.

**Evidence**: The crash happens during `reader.read()` or `response.text()`, both of which involve decompression.

**Test**: Add `Accept-Encoding: identity` header to disable compression.

### Theory 2: Raycast Node.js Runtime Issue

Raycast bundles its own Node.js runtime (22.14.0). This specific version or Raycast's configuration may have a bug or memory limitation.

**Evidence**: The crash only happens in Raycast context, not confirmed in standalone Node.js.

**Test**: Create standalone Node.js script to fetch dribbble.com outside Raycast.

### Theory 3: Content-Type or Charset Handling

Certain response headers or character encodings might trigger regex-based parsing in Node.js internals.

**Evidence**: dribbble.com and granola.ai may have specific encoding configurations.

**Test**: Compare response headers between crashing and non-crashing sites.

### Theory 4: Concurrent Fetch Memory Pressure

Multiple parallel fetches (main HTML, wayback, host-meta, DNS) may create memory pressure that triggers the crash during regex compilation.

**Evidence**: The crash timing varies, suggesting interaction with other operations.

**Test**: Disable all parallel fetches and test with only the main HTML fetch.

### Theory 5: V8 Bug in Node 22.x

Node.js 22.x is relatively new. There may be a V8 bug that's been fixed in later versions.

**Evidence**: The error is a V8 internal error, not a Node.js API error.

**Test**: Check Node.js GitHub issues for similar RegExpCompiler crashes.

## Recommended Next Steps

1. **Create minimal reproduction script** - Standalone Node.js script that fetches dribbble.com to isolate Raycast vs Node.js issue

2. **Test `Accept-Encoding: identity`** - Disable compression to rule out decompression-related regex

3. **Search Raycast/Node.js issues** - Look for similar crashes reported by others

4. **Disable parallel fetches** - Test if sequential fetching avoids the crash

5. **Compare response headers** - Analyze differences between crashing and working sites

6. **Test with older Node.js** - If possible, test with Node 20.x or 18.x
