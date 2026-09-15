// Threads URLs
export const THREADS_BASE_URL = "https://www.threads.com";
export const THREADS_INTENT_URL = `${THREADS_BASE_URL}/intent`;

// Hosts we accept a post URL from.
export const THREADS_HOSTS = ["threads.com", "www.threads.com", "threads.net", "www.threads.net"];

// HTTP headers
//
// Threads serves an empty JS shell to ordinary browser user agents: the post's media
// only appears in the HTML for a crawler UA. The same UA is also what makes a
// `/share/<id>/` link redirect server-side to its canonical `/@user/post/<code>` URL —
// with a browser UA it answers 200 and never redirects. Both behaviours are load-bearing;
// see `resolveThreadsPost`.
export const CRAWLER_USER_AGENT = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
