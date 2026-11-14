import { toDataUri } from "./svg";

/**
 * Data URIs of rendered images, keyed by the state they show.
 *
 * Raycast shows an image without flicker once it has loaded that exact URI, so
 * the same string must be reused whenever the same state comes back. The
 * cache keeps the most recently used entries and drops the oldest beyond `limit`.
 */
export class ImageCache {
  private readonly entries = new Map<string, string>();

  constructor(private readonly limit = 500) {}

  get(key: string, render: () => string): string {
    let uri = this.entries.get(key);
    if (uri === undefined) {
      uri = toDataUri(render());
    } else {
      // Re-insert so the entry counts as recently used.
      this.entries.delete(key);
    }
    this.entries.set(key, uri);
    if (this.entries.size > this.limit) {
      this.entries.delete(this.entries.keys().next().value as string);
    }
    return uri;
  }

  get size(): number {
    return this.entries.size;
  }
}
