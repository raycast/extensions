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

/**
 * Remember a capability that answered yes, and keep asking while it says no.
 *
 * Asking a binary what it can do costs a process, and the answer cannot change
 * while that binary is the one on disk - so asking again on every fix is a
 * process spent on a settled question.
 *
 * The asymmetry is deliberate. `supportsAuditFlag` turns any failure into
 * `false`, so a no is not only "this rcc cannot" but also "something went wrong
 * while asking". Remembering that would keep the reader out of the fixes for
 * the rest of the session, including after they upgrade rcc with Raycast still
 * open. A yes is settled; a no is asked again.
 */
export function rememberYes<K extends string>(ask: (key: K) => Promise<boolean>): (key: K) => Promise<boolean> {
	const yes = new Map<K, Promise<boolean>>();
	return (key) => {
		const remembered = yes.get(key);
		if (remembered) return remembered;
		const asking = ask(key).then(
			(answer) => {
				if (!answer) yes.delete(key);
				return answer;
			},
			(error) => {
				yes.delete(key);
				throw error;
			},
		);
		yes.set(key, asking);
		return asking;
	};
}
