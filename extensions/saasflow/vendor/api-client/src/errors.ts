export class ApiError extends Error {
    readonly status: number;
    readonly statusText: string;
    readonly body: unknown;
    readonly url: string;
    readonly method: string;

    constructor(opts: { status: number; statusText: string; body: unknown; url: string; method: string }) {
        super(formatMessage(opts));
        this.name = "ApiError";
        this.status = opts.status;
        this.statusText = opts.statusText;
        this.body = opts.body;
        this.url = opts.url;
        this.method = opts.method;
    }
}

function formatMessage({
    status,
    statusText,
    body,
    method,
    url,
}: {
    status: number;
    statusText: string;
    body: unknown;
    method: string;
    url: string;
}): string {
    const detail =
        body && typeof body === "object" && "error" in body && typeof body.error === "string" ? body.error : statusText;
    return `${method} ${url} → ${status} ${detail}`;
}
