/**
 * Incremental extraction of the elements of one top-level JSON array, so a list response is
 * never materialised whole.
 *
 * This exists because of a hard limit, not a preference: a Raycast command gets a 100 MB JS
 * heap. One applications list is 30.2 MB of compact JSON, which becomes roughly 60 MB as a
 * UTF-16 JavaScript string plus another 50 MB of object graph once parsed. `response.json()`
 * holds both at once, so a single instance blows the limit and two in parallel do so twice
 * over. Measured, not estimated: that is the payload of a real instance holding 2053
 * applications.
 *
 * So the body is consumed as a stream, each element of `items` is parsed on its own, projected
 * to the row model, and dropped. Peak memory becomes one element plus the projection, which is
 * 1.5 MB for the same instance.
 *
 * The scanner is deliberately narrow. It does not parse JSON: it finds the named array and then
 * tracks brace and bracket depth, string state and escapes to know where each element ends,
 * handing that slice to `JSON.parse`. That is enough for an object-or-array element list and
 * small enough to test exhaustively, which a general streaming parser would not be.
 */

const OPENERS = new Set(["{", "["]);
const CLOSERS = new Set(["}", "]"]);

interface ScanState {
  /** Characters of the element currently being accumulated, empty when between elements. */
  buffer: string;
  depth: number;
  inString: boolean;
  escaped: boolean;
  /** True once the opening bracket of the target array has been consumed. */
  inArray: boolean;
  /** True once the array has been closed, after which everything is ignored. */
  done: boolean;
  /** Text not yet searched for the array key, kept bounded. */
  prelude: string;
}

function initialState(): ScanState {
  return {
    buffer: "",
    depth: 0,
    inString: false,
    escaped: false,
    inArray: false,
    done: false,
    prelude: "",
  };
}

/**
 * Finds `"<key>"` followed by a colon and an opening bracket. Returns the index just after the
 * bracket, or -1. Scanning the raw text is safe here because the key is matched with its quotes
 * and colon, and a value containing that exact sequence would have to be a JSON string holding
 * `"items":[`, which no ArgoCD field does.
 */
function findArrayStart(text: string, key: string): number {
  const needle = `"${key}"`;
  let from = 0;
  for (;;) {
    const at = text.indexOf(needle, from);
    if (at === -1) {
      return -1;
    }
    let index = at + needle.length;
    while (index < text.length && /\s/.test(text[index] as string)) index++;
    if (text[index] === ":") {
      index++;
      while (index < text.length && /\s/.test(text[index] as string)) index++;
      if (text[index] === "[") {
        return index + 1;
      }
      // `"items": null` is a valid empty answer, and there is nothing after it to stream.
      if (text.startsWith("null", index)) {
        return -2;
      }
    }
    from = at + needle.length;
  }
}

/** Keeps the unsearched prelude bounded while still allowing the key to straddle chunks. */
const PRELUDE_TAIL = 64;

function feed(state: ScanState, chunk: string, key: string, out: unknown[]): void {
  if (state.done) {
    return;
  }

  let text = chunk;

  if (!state.inArray) {
    const combined = state.prelude + text;
    const start = findArrayStart(combined, key);
    if (start === -2) {
      state.done = true;
      return;
    }
    if (start === -1) {
      state.prelude = combined.slice(-PRELUDE_TAIL);
      return;
    }
    state.inArray = true;
    state.prelude = "";
    text = combined.slice(start);
  }

  for (let index = 0; index < text.length; index++) {
    const char = text[index] as string;

    if (state.inString) {
      state.buffer += char;
      if (state.escaped) {
        state.escaped = false;
      } else if (char === "\\") {
        state.escaped = true;
      } else if (char === '"') {
        state.inString = false;
      }
      continue;
    }

    if (char === '"') {
      state.inString = true;
      state.buffer += char;
      continue;
    }

    if (OPENERS.has(char)) {
      state.depth++;
      state.buffer += char;
      continue;
    }

    if (CLOSERS.has(char)) {
      if (state.depth === 0) {
        // The closing bracket of the target array.
        flush(state, out);
        state.done = true;
        return;
      }
      state.depth--;
      state.buffer += char;
      if (state.depth === 0) {
        flush(state, out);
      }
      continue;
    }

    if (char === "," && state.depth === 0) {
      // Separator between elements. A complete element has already been flushed by its closing
      // bracket; anything left here is a scalar element, which this scanner does not expect.
      flush(state, out);
      continue;
    }

    if (state.depth === 0 && /\s/.test(char)) {
      continue;
    }

    state.buffer += char;
  }
}

function flush(state: ScanState, out: unknown[]): void {
  const text = state.buffer.trim();
  state.buffer = "";
  if (text.length === 0) {
    return;
  }
  try {
    out.push(JSON.parse(text));
  } catch {
    // A single unparseable element is dropped rather than taking the whole list down, the same
    // way the projection drops an element it cannot identify.
  }
}

export interface StreamArrayOptions {
  /** Name of the top-level array to extract. */
  key: string;
  /** Called with each parsed element. Return value ignored; throwing aborts the scan. */
  onItem: (item: unknown) => void;
}

/**
 * Consumes an async iterable of decoded text chunks and calls `onItem` for each element of the
 * named array. Chunk boundaries may fall anywhere, including inside a string or a key.
 */
export async function streamArrayItems(
  chunks: AsyncIterable<string>,
  options: StreamArrayOptions,
): Promise<void> {
  const state = initialState();
  const batch: unknown[] = [];

  for await (const chunk of chunks) {
    feed(state, chunk, options.key, batch);
    // Drained after every chunk so nothing accumulates beyond one chunk's worth of elements.
    for (const item of batch) {
      options.onItem(item);
    }
    batch.length = 0;
    if (state.done) {
      return;
    }
  }

  // A truncated body leaves a partial element behind; it is incomplete, so it is discarded.
  if (!state.done && state.buffer.trim().length > 0) {
    state.buffer = "";
  }
}

/** Splits a whole string, for tests and for callers that already hold the text. */
export function collectArrayItems(text: string, key: string): unknown[] {
  const state = initialState();
  const out: unknown[] = [];
  feed(state, text, key, out);
  return out;
}

/** Decodes a byte stream to text chunks without ever concatenating the whole body. */
export async function* decodeStream(
  stream: AsyncIterable<Uint8Array> | ReadableStream<Uint8Array>,
): AsyncGenerator<string> {
  const decoder = new TextDecoder("utf-8");
  const iterable =
    Symbol.asyncIterator in stream ? (stream as AsyncIterable<Uint8Array>) : toIterable(stream);
  for await (const bytes of iterable) {
    // stream: true so a multi-byte character split across chunks is not mangled.
    yield decoder.decode(bytes, { stream: true });
  }
  const tail = decoder.decode();
  if (tail.length > 0) {
    yield tail;
  }
}

async function* toIterable(stream: ReadableStream<Uint8Array>): AsyncGenerator<Uint8Array> {
  const reader = stream.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        return;
      }
      if (value) {
        yield value;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
