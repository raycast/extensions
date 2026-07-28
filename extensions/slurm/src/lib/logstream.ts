// Incremental line-splitter for `tail -F` streams shown in TailView.
//
// The naive version (`buffer += chunk; buffer.split("\n")`) leaks: Slurm job
// logs are usually ML training runs whose progress bars (tqdm, Keras, etc.)
// redraw with carriage returns (`\r`) and never emit a newline. The pending
// buffer then grows on every redraw until the Raycast worker hits its heap
// limit and dies with "JS heap out of memory".
//
// Fixes:
//  - treat CR, LF, and CRLF all as line terminators, so progress redraws flush
//    instead of accumulating;
//  - hard-cap the still-incomplete tail so a single break-less line (e.g. a
//    binary file or one enormous JSON record) can't grow without bound.

// Force-flush the pending buffer once it exceeds this many chars without a break.
const MAX_PENDING = 64 * 1024;

export type StreamSplit = { lines: string[]; buffer: string };

export function consumeStreamChunk(buffer: string, chunk: string): StreamSplit {
  const parts = (buffer + chunk).split(/\r\n|\r|\n/);
  let rest = parts.pop() ?? "";
  if (rest.length > MAX_PENDING) {
    // No terminator in sight — emit what we have so the buffer can't grow forever.
    parts.push(rest);
    rest = "";
  }
  return { lines: parts, buffer: rest };
}
