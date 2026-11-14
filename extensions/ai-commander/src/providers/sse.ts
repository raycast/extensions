/** One dispatched server-sent event. `event` is absent for plain `data:` messages. */
export interface SseEvent {
  event?: string;
  data: string;
}

const LF = 10;
const CR = 13;

/**
 * Parses a server-sent event stream as defined by the WHATWG HTML spec, section 9.2.
 *
 * Runs in linear time: each decoded chunk is scanned once, and only the unfinished line is carried over. `TextDecoder`
 * in streaming mode keeps multibyte characters intact across chunk boundaries.
 *
 * Deviation from the spec: a final event without a closing blank line is dispatched rather than dropped, so a provider
 * that omits the blank line does not lose its last event. Truncated JSON in such an event fails in the adapter.
 */
export async function* parseSse(source: AsyncIterable<Uint8Array>): AsyncGenerator<SseEvent> {
  const decoder = new TextDecoder("utf-8");
  let partial = "";
  let skipLeadingLf = false;
  let eventName: string | undefined;
  let dataLines: string[] = [];

  /** Applies one line and returns an event if the line was the blank one that completes it. */
  function applyLine(line: string): SseEvent | undefined {
    if (line === "") return takeEvent();
    const colon = line.indexOf(":");
    if (colon === 0) return undefined; // Comment, used as keepalive by OpenRouter.
    const field = colon < 0 ? line : line.slice(0, colon);
    if (field !== "data" && field !== "event") return undefined; // `id` and `retry` have no use here.
    const rawValue = colon < 0 ? "" : line.slice(colon + 1);
    const value = rawValue.startsWith(" ") ? rawValue.slice(1) : rawValue;
    if (field === "data") dataLines.push(value);
    else eventName = value;
    return undefined;
  }

  function takeEvent(): SseEvent | undefined {
    const event: SseEvent | undefined =
      dataLines.length === 0
        ? undefined
        : { ...(eventName === undefined ? {} : { event: eventName }), data: dataLines.join("\n") };
    eventName = undefined;
    dataLines = [];
    return event;
  }

  function* scan(text: string): Generator<SseEvent> {
    if (text === "") return;
    let start = 0;
    // A CR at the end of the previous chunk may be the first half of a CRLF.
    if (skipLeadingLf && text.charCodeAt(0) === LF) start = 1;
    skipLeadingLf = false;

    for (let i = start; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code !== LF && code !== CR) continue;
      const event = applyLine(partial + text.slice(start, i));
      partial = "";
      if (code === CR) {
        if (i + 1 === text.length) skipLeadingLf = true;
        else if (text.charCodeAt(i + 1) === LF) i++;
      }
      start = i + 1;
      if (event !== undefined) yield event;
    }
    partial += text.slice(start);
  }

  for await (const chunk of source) {
    yield* scan(decoder.decode(chunk, { stream: true }));
  }
  yield* scan(decoder.decode());

  if (partial !== "") {
    const event = applyLine(partial);
    if (event !== undefined) yield event;
  }
  const last = takeEvent();
  if (last !== undefined) yield last;
}
