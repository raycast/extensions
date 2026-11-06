// Server-sent events, just enough of the spec to read an MCP reply.
//
// An event is a block of lines ended by a blank line; its payload is every
// `data:` line in the block joined with "\n". A JSON-RPC reply can therefore
// span several data lines, and a stream can carry notifications before the
// reply, so the reply is the event whose JSON carries the request's id.

export function sseEvents(raw: string): string[] {
  const events: string[] = [];
  let data: string[] = [];
  const flush = () => {
    if (data.length) events.push(data.join("\n"));
    data = [];
  };
  for (const line of raw.split(/\r\n|\r|\n/)) {
    if (line === "") flush();
    else if (line.startsWith("data:")) data.push(line.slice(line.startsWith("data: ") ? 6 : 5));
    // Comments (":"), event names, ids and retry hints carry nothing we read.
  }
  flush();
  return events;
}

/** The JSON-RPC reply to request `id` in an SSE body, or undefined when there is none. */
export function sseReply<T extends { id?: unknown }>(raw: string, id: number | string): T | undefined {
  let fallback: T | undefined;
  for (const event of sseEvents(raw)) {
    let message: T;
    try {
      message = JSON.parse(event) as T;
    } catch {
      continue;
    }
    if (message.id === id) return message;
    if (message.id !== undefined && ("result" in message || "error" in message)) fallback = message;
  }
  return fallback;
}
