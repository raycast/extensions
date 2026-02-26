# Website Down Checker

Quickly check if a website is up, down, blocked by your network, or available for purchase — right from Raycast.

## Features

- **UP** — Server responded (2xx, 3xx, 4xx status codes)
- **DOWN** — Server error (5xx), timeout, or connection failure
- **BLOCKED** — Site is up globally but unreachable from your network (e.g. ISP blocking)
- **AVAILABLE** — Domain is not registered and may be available to buy

Type any domain or URL (e.g. `google.com`) and press Enter. The extension checks the site and shows the result with status code and response time.

When a site can't be reached locally, the extension cross-checks with an external service to determine if it's actually down or just blocked on your network. It also checks DNS nameserver records to detect unregistered domains.

Recent checks are saved to history for quick reference.
