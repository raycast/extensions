export function serialized() {
	let tail: Promise<unknown> = Promise.resolve();
	return <T>(task: () => Promise<T>): Promise<T> => {
		const next = tail.then(task);
		tail = next.catch(() => undefined);
		return next;
	};
}
