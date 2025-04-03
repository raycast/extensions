export function debounced<T, A>(fn: (...args: A[]) => T, delayMs: number) {
	let timeout: ReturnType<typeof setTimeout>;

	return function (...args: A[]) {
		clearTimeout(timeout);

		timeout = setTimeout(() => fn(...args), delayMs);
	};
}
