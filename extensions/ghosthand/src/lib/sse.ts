import { StringDecoder } from "node:string_decoder";
import { GhosthandError } from "./errors";

export type ServerEvent = { event: string; data: string };

/** Incremental SSE framing, including CRLF split across reads and UTF-8 split across bytes. */
export async function* readEvents(source: AsyncIterable<Uint8Array>): AsyncGenerator<ServerEvent> {
  const decoder = new StringDecoder("utf8");
  let buffer = "";
  let event = "message";
  let data: string[] = [];
  let eventSize = 0;

  function line(value: string): ServerEvent | undefined {
    if (!value) {
      const result = data.length ? { event, data: data.join("\n") } : undefined;
      event = "message";
      data = [];
      eventSize = 0;
      return result;
    }
    if (value.startsWith(":")) return;
    const colon = value.indexOf(":");
    const field = colon < 0 ? value : value.slice(0, colon);
    const content = colon < 0 ? "" : value.slice(colon + 1).replace(/^ /, "");
    if (field === "event") event = content;
    if (field === "data") {
      eventSize += content.length;
      if (eventSize > 2_000_000)
        throw new GhosthandError("invalid-stream", "A task event exceeded the supported size.");
      data.push(content);
    }
  }

  for await (const chunk of source) {
    buffer += decoder.write(Buffer.from(chunk));
    let match: RegExpExecArray | null;
    while ((match = /\r\n|\r|\n/.exec(buffer))) {
      // A final CR may be the first half of CRLF in the next read.
      if (match[0] === "\r" && match.index === buffer.length - 1) break;
      const result = line(buffer.slice(0, match.index));
      buffer = buffer.slice(match.index + match[0].length);
      if (result) yield result;
    }
    if (buffer.length > 2_000_000)
      throw new GhosthandError("invalid-stream", "A task event exceeded the supported size.");
  }
  buffer += decoder.end();
  for (const value of buffer.split(/\r\n|\r|\n/).slice(0, -1)) {
    const result = line(value);
    if (result) yield result;
  }
  // An unfinished event is deliberately not dispatched at EOF.
}
