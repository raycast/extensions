export function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function post(fetcher: typeof fetch, url: string, init: RequestInit, timeoutMs: number) {
	return fetcher(url, {
		...init,
		method: 'POST',
		redirect: 'error',
		signal: AbortSignal.timeout(timeoutMs),
	});
}
export function postJson(
	fetcher: typeof fetch,
	url: string,
	body: unknown,
	headers: Record<string, string> = {},
) {
	return post(
		fetcher,
		url,
		{ headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) },
		30000,
	);
}
export function postForm(
	fetcher: typeof fetch,
	url: string,
	params: Record<string, string>,
	timeoutMs = 30000,
) {
	return post(
		fetcher,
		url,
		{
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams(params),
		},
		timeoutMs,
	);
}
