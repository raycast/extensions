# 550W Watermark & Text Eraser Changelog

## [3.1.6] - 2026-10-25

- Preserve actionable authorization recovery on HTTP 401/403 without replaying processing requests.
- Include product and package version declarations in supported OAuth and service requests.

## [Prepare 3.1.5 Review Candidate] - {PR_MERGE_DATE}

- Show action-specific inputs and upload limits.
- Add manual status checks for accepted image and video tasks.
- Prevent concurrent submissions and distinguish local validation from uncertain requests.
- Preserve regional API key and purchase links; support native OAuth and API Key authentication.
- Make source preparation independent of the working directory.
- Present task status, failure details, and validated result links instead of raw JSON.
- Handle nested image task responses and completed-query result links.
- Keep operation IDs fixed while requests are pending and send four zero coordinates for full-frame video processing.
- Build independent English Store and Chinese self-distribution candidates with fixed locale and regional account links.
- Update Raycast API to 2.6.2 and add the official ESLint configuration and strict metadata checks.
- Stage distribution builds, source archives, and native .rayext bundles without importing development builds into Raycast.
