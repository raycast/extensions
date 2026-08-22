/**
 * The MCP endpoint may answer a POST as plain JSON or as an SSE-framed body — the server chooses,
 * per the Streamable HTTP spec, and the client must handle both. Within an SSE body the spec also
 * allows several JSON-RPC messages (notifications before the response), and the SSE standard allows
 * one event's payload to span several `data:` lines. So: parse every event, then pick the message
 * answering our request id, rather than trusting the last line to be the answer.
 */
export function parseEventStream(body: string, id?: number): unknown {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Val Town returned an empty response");

  // The plain-JSON case.
  if (!trimmed.split(/\r?\n/).some((line) => line.startsWith("data:"))) {
    try {
      return JSON.parse(trimmed);
    } catch {
      throw new Error("Could not parse the response from Val Town");
    }
  }

  // SSE: events split on blank lines; an event's data lines concatenate with newlines.
  const messages: Record<string, unknown>[] = [];
  for (const event of trimmed.split(/\r?\n\r?\n/)) {
    const data = event
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice("data:".length).replace(/^ /, ""))
      .join("\n");
    if (!data) continue;

    try {
      messages.push(JSON.parse(data) as Record<string, unknown>);
    } catch {
      // A non-JSON frame (a ping, a comment) is not ours to fail on.
    }
  }

  const responses = messages.filter((message) => "result" in message || "error" in message);
  const match = (id === undefined ? undefined : responses.find((message) => message.id === id)) ?? responses.at(-1);
  if (!match) throw new Error("Could not parse the response from Val Town");
  return match;
}
