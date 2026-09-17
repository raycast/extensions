/**
 * Read something expensive once, but do not let a failure become the answer.
 *
 * `cached ??= read()` is the obvious way to do this and is wrong in one place:
 * a rejected promise is neither null nor undefined, so `??=` never reassigns it
 * and every later caller is handed the same failure for the life of the
 * process. The screen that offers "Run Again" then cannot fix anything, because
 * there is nothing left to re-run.
 *
 * So the value is kept only while it is pending or fulfilled, and a rejection
 * clears it: the next caller reads again, which is what the reader is asking
 * for when they press the key.
 */
export function cacheUntilRejected<T>(read: () => Promise<T>): () => Promise<T> {
	let cached: Promise<T> | undefined;
	return () => {
		cached ??= read().catch((error) => {
			cached = undefined;
			throw error;
		});
		return cached;
	};
}
