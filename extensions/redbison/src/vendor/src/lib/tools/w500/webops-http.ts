/**
 * HTTP status code reference. Registered codes follow the IANA "HTTP Status
 * Code Registry" (https://www.iana.org/assignments/http-status-codes) with
 * the defining RFC and section. RFC 9110 (HTTP Semantics, June 2022) replaced
 * RFC 7231 and friends, so most codes cite it. A short list of widely seen
 * unregistered codes (nginx, Cloudflare, Laravel) is included and flagged.
 */

import { msg } from '../../msg';

export type StatusClass = '1xx' | '2xx' | '3xx' | '4xx' | '5xx';

export type HttpStatus = {
  code: number;
  name: string;
  /** Defining document, e.g. "RFC 9110 §15.5.5". For unofficial codes, the vendor. */
  spec: string;
  /** IANA-registered (true) or vendor-specific / unofficial (false). */
  official: boolean;
  /** Deprecated, obsolete or reserved-unused in the registry. */
  deprecated?: boolean;
  /** One-sentence meaning. */
  summary: string;
  /** When a server should send it, and what the client should do. */
  usage: string;
  /** Common confusion or pitfall. */
  note?: string;
};

/** RFC 9110 §15.1: status codes that are cacheable by default (heuristic freshness allowed). */
export const HEURISTICALLY_CACHEABLE = [200, 203, 204, 206, 300, 301, 308, 404, 405, 410, 414, 501] as const;

const S = (
  code: number,
  name: string,
  spec: string,
  summary: string,
  usage: string,
  extra: { note?: string; official?: boolean; deprecated?: boolean } = {},
): HttpStatus => ({ code, name, spec, summary, usage, official: extra.official ?? true, deprecated: extra.deprecated, note: extra.note });

export const HTTP_STATUSES: HttpStatus[] = [
  // 1xx informational
  S(100, 'Continue', 'RFC 9110 §15.2.1', msg('The server has received the request headers and the client should send the body.'), msg('Sent in reply to a request carrying "Expect: 100-continue", so a client can check that a large upload will be accepted before sending it.'), { note: msg('Clients that did not send Expect: 100-continue may ignore it. A final status always follows.') }),
  S(101, 'Switching Protocols', 'RFC 9110 §15.2.2', msg('The server agrees to switch to the protocol named in the Upgrade header.'), msg('Used for the WebSocket handshake (RFC 6455) and the old h2c upgrade over HTTP/1.1.'), { note: msg('Not used in HTTP/2 or HTTP/3, which do not support the Upgrade mechanism.') }),
  S(102, 'Processing', 'RFC 2518 §10.1', msg('The server has accepted a WebDAV request and is still working on it.'), msg('Historic WebDAV interim response to stop a client timing out on a long operation.'), { deprecated: true, note: msg('Dropped from WebDAV in RFC 4918 but still listed by IANA. Rarely seen today.') }),
  S(103, 'Early Hints', 'RFC 8297', msg('Preliminary headers sent before the final response, usually Link preload or preconnect hints.'), msg('Lets a CDN or server tell the browser to start fetching CSS, fonts or a third-party origin while the page is still being generated.'), { note: msg('Browsers act on Link headers in 103 only over HTTP/2 or HTTP/3 in practice.') }),

  // 2xx success
  S(200, 'OK', 'RFC 9110 §15.3.1', msg('The request succeeded.'), msg('The default success response. For GET the body is the resource; for POST it describes the result of the action.')),
  S(201, 'Created', 'RFC 9110 §15.3.2', msg('The request created one or more new resources.'), msg('Return after a POST or PUT creates something, with a Location header pointing at the new resource.')),
  S(202, 'Accepted', 'RFC 9110 §15.3.3', msg('The request was accepted for processing but is not finished.'), msg('Use for queued or asynchronous jobs. Include a way to check progress, such as a status URL.'), { note: msg('Promises nothing about the outcome: the job may still fail.') }),
  S(203, 'Non-Authoritative Information', 'RFC 9110 §15.3.4', msg('The response was modified by a transforming proxy from the origin\'s 200.'), msg('Sent by intermediaries that changed the payload, for example a proxy that recompressed images.')),
  S(204, 'No Content', 'RFC 9110 §15.3.5', msg('Success with no response body.'), msg('Common for DELETE, for PUT that does not echo the resource, and for form saves where the page should not change.'), { note: msg('A 204 must not contain a body; any bytes after the headers are an error.') }),
  S(205, 'Reset Content', 'RFC 9110 §15.3.6', msg('Success, and the client should reset the document view (for example clear a form).'), msg('Rarely used by browsers; sometimes used by APIs to say "clear your input".')),
  S(206, 'Partial Content', 'RFC 9110 §15.3.7', msg('The body is the byte range(s) asked for with a Range header.'), msg('Used for resumable downloads and media seeking. Comes with Content-Range, or a multipart/byteranges body for several ranges.')),
  S(207, 'Multi-Status', 'RFC 4918 §11.1', msg('A WebDAV XML body carries separate status codes for several resources.'), msg('Returned by WebDAV methods such as PROPFIND that act on many resources at once.')),
  S(208, 'Already Reported', 'RFC 5842 §7.1', msg('Members of a WebDAV binding were already listed earlier in the same multistatus response.'), msg('Prevents a WebDAV client from walking the same collection twice when bindings create loops.')),
  S(226, 'IM Used', 'RFC 3229 §10.4.1', msg('The response is the result of instance manipulations (delta encoding) applied to the current resource.'), msg('Part of HTTP delta encoding, which saw little adoption.')),

  // 3xx redirection
  S(300, 'Multiple Choices', 'RFC 9110 §15.4.1', msg('The resource has several representations and the client may choose one.'), msg('Rare. Content negotiation is usually done silently with Accept headers instead.')),
  S(301, 'Moved Permanently', 'RFC 9110 §15.4.2', msg('The resource has a new permanent URL, given in Location.'), msg('Use when a page or site moves for good. Search engines transfer the old URL\'s signals to the new one.'), { note: msg('For historical reasons clients may change POST to GET when following a 301. Use 308 when the method must be kept.') }),
  S(302, 'Found', 'RFC 9110 §15.4.3', msg('The resource is temporarily at another URL.'), msg('Use for short-lived moves, login bounces and A/B routing where the original URL should stay indexed.'), { note: msg('Browsers change POST to GET when following 302. Use 307 to keep the method and body.') }),
  S(303, 'See Other', 'RFC 9110 §15.4.4', msg('The client should GET a different URL to see the result.'), msg('The Post/Redirect/Get pattern: after a form POST, send 303 to the result page so a refresh does not resubmit.')),
  S(304, 'Not Modified', 'RFC 9110 §15.4.5', msg('The cached copy is still valid; no body is sent.'), msg('Answer to a conditional GET (If-None-Match or If-Modified-Since) when the ETag or date still matches.'), { note: msg('Not really a redirect: it tells the client to use its own cache.') }),
  S(305, 'Use Proxy', 'RFC 9110 §15.4.6', msg('Deprecated. Was meant to tell the client to use a proxy.'), msg('Do not use. Browsers ignore it for security reasons.'), { deprecated: true }),
  S(306, '(Unused)', 'RFC 9110 §15.4.7', msg('Reserved. Was "Switch Proxy" in a draft and is no longer used.'), msg('Never send it.'), { deprecated: true }),
  S(307, 'Temporary Redirect', 'RFC 9110 §15.4.8', msg('Temporarily at another URL, and the client must repeat the same method and body there.'), msg('Use instead of 302 when a POST or PUT must not turn into a GET. Browsers also show 307 for internal HSTS upgrades.')),
  S(308, 'Permanent Redirect', 'RFC 9110 §15.4.9', msg('Permanently at another URL, and the client must repeat the same method and body there.'), msg('The method-preserving version of 301. Vercel and Next.js use 308 for permanent redirects by default.')),

  // 4xx client error
  S(400, 'Bad Request', 'RFC 9110 §15.5.1', msg('The server cannot process the request because of a client error.'), msg('Malformed syntax, invalid JSON, a missing required parameter or a request that fails validation.')),
  S(401, 'Unauthorized', 'RFC 9110 §15.5.2', msg('The request lacks valid authentication credentials.'), msg('Send when the user is not logged in or the token is missing or expired. Must include a WWW-Authenticate header.'), { note: msg('Despite the name it means "unauthenticated". Use 403 when the caller is known but not allowed.') }),
  S(402, 'Payment Required', 'RFC 9110 §15.5.3', msg('Reserved for future use.'), msg('Not standardised. Some APIs use it for exhausted credit or an unpaid plan.')),
  S(403, 'Forbidden', 'RFC 9110 §15.5.4', msg('The server understood the request but refuses to authorise it.'), msg('The caller is authenticated (or authentication would not help) but lacks permission. Logging in again will not change the answer.'), { note: msg('Servers may return 404 instead to hide that a resource exists.') }),
  S(404, 'Not Found', 'RFC 9110 §15.5.5', msg('No resource exists at this URL, or the server will not say whether it does.'), msg('The default for unknown URLs. Cacheable by default, so a temporary 404 can stick in caches.')),
  S(405, 'Method Not Allowed', 'RFC 9110 §15.5.6', msg('The resource exists but does not support this method.'), msg('For example POST to a read-only endpoint. Must include an Allow header listing the supported methods.')),
  S(406, 'Not Acceptable', 'RFC 9110 §15.5.7', msg('No representation matches the request\'s Accept headers.'), msg('Rarely sent: most servers fall back to a default format instead of refusing.')),
  S(407, 'Proxy Authentication Required', 'RFC 9110 §15.5.8', msg('Like 401, but the client must authenticate with the proxy.'), msg('Sent by forward proxies with a Proxy-Authenticate header.')),
  S(408, 'Request Timeout', 'RFC 9110 §15.5.9', msg('The server did not receive a complete request in time.'), msg('Servers send it before closing an idle connection. The client may retry on a new connection.')),
  S(409, 'Conflict', 'RFC 9110 §15.5.10', msg('The request conflicts with the current state of the resource.'), msg('Edit conflicts, duplicate unique keys, or creating something that already exists. Describe the conflict in the body.')),
  S(410, 'Gone', 'RFC 9110 §15.5.11', msg('The resource used to exist and has been removed for good.'), msg('Tell clients and crawlers the removal is deliberate. Google documents that it drops both 404 and 410 URLs from the index; 410 states the intent more clearly.')),
  S(411, 'Length Required', 'RFC 9110 §15.5.12', msg('The server requires a Content-Length header.'), msg('Sent when a request body arrives without a length and the server does not accept chunked uploads.')),
  S(412, 'Precondition Failed', 'RFC 9110 §15.5.13', msg('A conditional header such as If-Match or If-Unmodified-Since evaluated to false.'), msg('Optimistic locking: the client\'s ETag is stale, so the update is rejected to avoid a lost update.')),
  S(413, 'Content Too Large', 'RFC 9110 §15.5.14', msg('The request body is larger than the server will accept.'), msg('Upload limits, such as nginx client_max_body_size (default 1 MB). May include Retry-After if temporary.'), { note: msg('Called "Payload Too Large" in RFC 7231 and "Request Entity Too Large" before that.') }),
  S(414, 'URI Too Long', 'RFC 9110 §15.5.15', msg('The request target is longer than the server will interpret.'), msg('Usually a GET with a huge query string that should have been a POST, or a redirect loop that keeps appending.')),
  S(415, 'Unsupported Media Type', 'RFC 9110 §15.5.16', msg('The body\'s Content-Type or Content-Encoding is not supported.'), msg('For example sending form data to a JSON-only endpoint. Respond with Accept or Accept-Encoding to show what works.')),
  S(416, 'Range Not Satisfiable', 'RFC 9110 §15.5.17', msg('None of the requested byte ranges overlap the resource.'), msg('A Range header past the end of the file. Send Content-Range: bytes */<length>.')),
  S(417, 'Expectation Failed', 'RFC 9110 §15.5.18', msg('The server cannot meet the Expect header.'), msg('Typically an Expect value other than 100-continue.')),
  S(418, '(Unused) / I\'m a teapot', 'RFC 9110 §15.5.19; RFC 2324', msg('Reserved. Originally the April Fools\' "I\'m a teapot" from the coffee-pot protocol.'), msg('Do not use for real errors. RFC 9110 reserves it because enough software implements the joke that it cannot be reassigned.'), { deprecated: true }),
  S(421, 'Misdirected Request', 'RFC 9110 §15.5.20', msg('The request reached a server that cannot answer for this host and scheme.'), msg('Happens when an HTTP/2 connection is reused for a host its certificate covers but the server is not configured for. The client should retry on a new connection.')),
  S(422, 'Unprocessable Content', 'RFC 9110 §15.5.21', msg('The syntax is valid but the content fails semantic validation.'), msg('A well-formed JSON body whose values break business rules, such as an end date before the start date.'), { note: msg('Was "Unprocessable Entity" in WebDAV (RFC 4918). Choosing 400 or 422 for validation errors is an API style decision.') }),
  S(423, 'Locked', 'RFC 4918 §11.3', msg('The WebDAV resource is locked.'), msg('Returned when another client holds a lock on the resource.')),
  S(424, 'Failed Dependency', 'RFC 4918 §11.4', msg('The method failed because an earlier action it depended on failed.'), msg('Used inside WebDAV multistatus responses.')),
  S(425, 'Too Early', 'RFC 8470 §5.2', msg('The server will not process a request that might be replayed from TLS 1.3 early data.'), msg('Protects non-idempotent requests sent in 0-RTT data. The client should retry after the handshake.')),
  S(426, 'Upgrade Required', 'RFC 9110 §15.5.22', msg('The server refuses the request on the current protocol and names a required one in Upgrade.'), msg('For example demanding TLS or a newer HTTP version.')),
  S(428, 'Precondition Required', 'RFC 6585 §3', msg('The server requires the request to be conditional.'), msg('Forces clients to send If-Match so concurrent edits cannot overwrite each other.')),
  S(429, 'Too Many Requests', 'RFC 6585 §4', msg('The client sent too many requests in a given time (rate limiting).'), msg('Include Retry-After with seconds or a date. Clients should back off, ideally with jitter.')),
  S(431, 'Request Header Fields Too Large', 'RFC 6585 §5', msg('One header, or all headers together, are too large.'), msg('Often caused by oversized cookies. Clearing cookies for the site usually fixes it.')),
  S(451, 'Unavailable For Legal Reasons', 'RFC 7725 §3', msg('Access is denied because of a legal demand.'), msg('Court orders, government censorship or geo-blocking for legal reasons. Should include a Link with rel="blocked-by".')),

  // 5xx server error
  S(500, 'Internal Server Error', 'RFC 9110 §15.6.1', msg('The server hit an unexpected condition.'), msg('The generic catch-all for unhandled exceptions. Log the details server-side; do not leak stack traces to clients.')),
  S(501, 'Not Implemented', 'RFC 9110 §15.6.2', msg('The server does not support the functionality needed, such as an unknown method.'), msg('Use for methods the server does not recognise at all. Cacheable by default.')),
  S(502, 'Bad Gateway', 'RFC 9110 §15.6.3', msg('A gateway or proxy got an invalid response from the upstream server.'), msg('Typical when nginx or a load balancer cannot connect to the app, or the app crashed mid-response.')),
  S(503, 'Service Unavailable', 'RFC 9110 §15.6.4', msg('The server is temporarily unable to handle the request.'), msg('Maintenance or overload. Add Retry-After. Search engines treat a short 503 as temporary and keep the page indexed.')),
  S(504, 'Gateway Timeout', 'RFC 9110 §15.6.5', msg('A gateway or proxy did not get a response from upstream in time.'), msg('A slow query or blocked worker behind nginx (proxy_read_timeout defaults to 60 s) or a cloud load balancer.')),
  S(505, 'HTTP Version Not Supported', 'RFC 9110 §15.6.6', msg('The server does not support the HTTP major version used.'), msg('Rare in practice.')),
  S(506, 'Variant Also Negotiates', 'RFC 2295 §8.1', msg('Transparent content negotiation is misconfigured and loops.'), msg('Only seen with experimental content negotiation setups.')),
  S(507, 'Insufficient Storage', 'RFC 4918 §11.5', msg('The server cannot store what is needed to complete the request.'), msg('WebDAV disk quota exceeded.')),
  S(508, 'Loop Detected', 'RFC 5842 §7.2', msg('The server found an infinite loop while processing a WebDAV request.'), msg('Depth-infinity operations over bindings that refer back to themselves.')),
  S(510, 'Not Extended', 'RFC 2774 §7', msg('Further extensions to the request are required.'), msg('Part of the HTTP Extension Framework, now marked obsolete by IANA.'), { deprecated: true }),
  S(511, 'Network Authentication Required', 'RFC 6585 §6', msg('The client must authenticate to gain network access.'), msg('Sent by captive portals on hotel and airport Wi-Fi, never by origin servers.')),

  // Unofficial, widely seen
  S(419, 'Page Expired', 'Laravel framework', msg('The CSRF token is missing or expired.'), msg('Laravel returns it when a form is submitted after the session expired.'), { official: false }),
  S(444, 'No Response', 'nginx', msg('nginx closed the connection without sending anything.'), msg('Configured with "return 444;" to drop unwanted or malicious requests. Never reaches the client as a status.'), { official: false }),
  S(494, 'Request Header Too Large', 'nginx', msg('nginx\'s internal code for headers over large_client_header_buffers.'), msg('Logged by nginx; clients receive 400.'), { official: false }),
  S(495, 'SSL Certificate Error', 'nginx', msg('The client certificate failed verification.'), msg('Mutual TLS setups; clients receive 400.'), { official: false }),
  S(496, 'SSL Certificate Required', 'nginx', msg('A required client certificate was not sent.'), msg('Mutual TLS setups; clients receive 400.'), { official: false }),
  S(497, 'HTTP Request Sent to HTTPS Port', 'nginx', msg('A plain HTTP request arrived on a TLS port.'), msg('Often handled with "error_page 497 =301 https://$host$request_uri;".'), { official: false }),
  S(499, 'Client Closed Request', 'nginx', msg('The client closed the connection before nginx sent a response.'), msg('Shows up in nginx access logs when users cancel or a client-side timeout is shorter than the backend\'s response time.'), { official: false }),
  S(509, 'Bandwidth Limit Exceeded', 'Apache / cPanel', msg('The hosting account has exceeded its bandwidth quota.'), msg('Shared hosting control panels. Not part of any standard.'), { official: false }),
  S(520, 'Web Server Returned an Unknown Error', 'Cloudflare', msg('The origin returned an empty, unknown or unexpected response.'), msg('Cloudflare-only. Check origin logs for crashes or oversized headers.'), { official: false }),
  S(521, 'Web Server Is Down', 'Cloudflare', msg('The origin refused Cloudflare\'s connection.'), msg('Origin server offline or a firewall blocking Cloudflare IP ranges.'), { official: false }),
  S(522, 'Connection Timed Out', 'Cloudflare', msg('Cloudflare could not complete a TCP handshake with the origin.'), msg('Overloaded origin, wrong DNS origin IP or dropped packets.'), { official: false }),
  S(523, 'Origin Is Unreachable', 'Cloudflare', msg('Cloudflare cannot route to the origin.'), msg('Usually wrong DNS records for the origin.'), { official: false }),
  S(524, 'A Timeout Occurred', 'Cloudflare', msg('Cloudflare connected but the origin did not send an HTTP response within the timeout (100 s by default).'), msg('Move long jobs to a background queue and poll for the result.'), { official: false }),
  S(525, 'SSL Handshake Failed', 'Cloudflare', msg('The TLS handshake between Cloudflare and the origin failed.'), msg('Check the origin certificate and cipher support in Full or Full (strict) SSL mode.'), { official: false }),
  S(526, 'Invalid SSL Certificate', 'Cloudflare', msg('The origin certificate is invalid in Full (strict) mode.'), msg('Install a valid or Cloudflare Origin CA certificate on the origin.'), { official: false }),
].sort((a, b) => a.code - b.code);

export const STATUS_CLASSES: { id: StatusClass; name: string; desc: string }[] = [
  { id: '1xx', name: msg('Informational'), desc: msg('Interim responses; the final status follows.') },
  { id: '2xx', name: msg('Successful'), desc: msg('The request was received, understood and accepted.') },
  { id: '3xx', name: msg('Redirection'), desc: msg('Further action, usually following Location, is needed.') },
  { id: '4xx', name: msg('Client error'), desc: msg('The request is wrong or cannot be fulfilled as sent.') },
  { id: '5xx', name: msg('Server error'), desc: msg('The server failed to fulfil a valid request.') },
];

export function statusClass(code: number): StatusClass | null {
  if (!Number.isInteger(code) || code < 100 || code > 599) return null;
  return `${Math.floor(code / 100)}xx` as StatusClass;
}

export function getStatus(code: number): HttpStatus | undefined {
  return HTTP_STATUSES.find((s) => s.code === code);
}

export function isHeuristicallyCacheable(code: number): boolean {
  return (HEURISTICALLY_CACHEABLE as readonly number[]).includes(code);
}

export type StatusFilter = { query?: string; classes?: StatusClass[]; includeUnofficial?: boolean };

/**
 * Search by code ("404"), code prefix ("5", "50"), class ("4xx") or words in
 * the name, meaning or usage. Exact code matches sort first.
 */
export function searchStatuses({ query = '', classes, includeUnofficial = true }: StatusFilter = {}): HttpStatus[] {
  const q = query.trim().toLowerCase();
  let list = HTTP_STATUSES.filter((s) => includeUnofficial || s.official);
  if (classes && classes.length) list = list.filter((s) => classes.includes(statusClass(s.code)!));
  if (!q) return list;
  const classMatch = q.match(/^([1-5])xx$/);
  if (classMatch) return list.filter((s) => String(s.code)[0] === classMatch[1]);
  if (/^\d{1,3}$/.test(q)) return list.filter((s) => String(s.code).startsWith(q));
  const words = q.split(/\s+/).filter(Boolean);
  const scored = list
    .map((s) => {
      const name = s.name.toLowerCase();
      const hay = `${s.code} ${name} ${s.summary} ${s.usage} ${s.note ?? ''} ${s.spec}`.toLowerCase();
      if (!words.every((w) => hay.includes(w))) return null;
      const esc = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const score = words.reduce((n, w) => {
        const start = new RegExp(`\\b${esc(w)}`);
        if (start.test(name)) return n + 4;
        if (start.test(s.summary.toLowerCase())) return n + 3;
        if (start.test(hay)) return n + 2;
        return n + 1;
      }, 0);
      return { s, score };
    })
    .filter((x): x is { s: HttpStatus; score: number } => x !== null);
  scored.sort((a, b) => b.score - a.score || a.s.code - b.s.code);
  return scored.map((x) => x.s);
}

/** Generic meaning for a code that is in range but not in the table (RFC 9110 §15: treat as x00 of its class). */
export function describeUnknown(code: number): string | null {
  const cls = statusClass(code);
  if (!cls) return null;
  const base = getStatus(Math.floor(code / 100) * 100);
  return `${code} is not a registered status code. RFC 9110 §15 says a client must treat an unrecognised code as the x00 code of its class, so ${code} is handled like ${base?.code} ${base?.name}.`;
}

/** Plain-text summary used by copy buttons and MCP. */
export function statusToText(s: HttpStatus): string {
  const lines = [
    `${s.code} ${s.name}`,
    `Spec: ${s.spec}${s.official ? '' : ' (unofficial)'}${s.deprecated ? ' (deprecated or reserved)' : ''}`,
    `Meaning: ${s.summary}`,
    `When to use: ${s.usage}`,
  ];
  if (s.note) lines.push(`Note: ${s.note}`);
  if (isHeuristicallyCacheable(s.code)) lines.push('Cacheable by default (RFC 9110 §15.1).');
  return lines.join('\n');
}

/** Pick the right redirect code from two questions. */
export function chooseRedirect(permanent: boolean, keepMethod: boolean): 301 | 302 | 307 | 308 {
  if (permanent) return keepMethod ? 308 : 301;
  return keepMethod ? 307 : 302;
}
