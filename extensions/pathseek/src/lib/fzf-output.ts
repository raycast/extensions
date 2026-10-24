/**
 * NUL-delimited fzf output accumulator. The result cap is strict even when
 * stdout arrives in large chunks or multiple queued "data" callbacks.
 */
export const MAX_FZF_RESULTS = 150;

export type FzfOutputState = {
  pending: Buffer;
  results: string[];
  limitReached: boolean;
};

export function createFzfOutputState(): FzfOutputState {
  return { pending: Buffer.alloc(0), results: [], limitReached: false };
}

export function appendFzfOutputChunk(
  state: FzfOutputState,
  chunk: Buffer,
  maxResults = MAX_FZF_RESULTS,
): void {
  if (state.limitReached || !chunk.length) return;
  const data = Buffer.concat([state.pending, chunk]);
  let offset = 0;

  while (offset < data.length) {
    const boundary = data.indexOf(0, offset);
    if (boundary === -1) break;
    const filename = data.subarray(offset, boundary).toString("utf8");
    if (filename) state.results.push(filename);
    offset = boundary + 1;

    if (state.results.length >= maxResults) {
      state.limitReached = true;
      state.pending = Buffer.alloc(0);
      return;
    }
  }
  state.pending = data.subarray(offset);
}
