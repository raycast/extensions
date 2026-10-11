# 550W Watermark & Text Eraser

Erase image watermarks and text, local video subtitles and watermarks, and resolve TikTok and X video share links with the 550W Open API. Processing may consume account credits; queries do not submit new processing tasks.

## Setup

Choose OAuth (default) or API Key in Raycast preferences. For OAuth, run **Connect 550W Account** before submitting. Raycast generates PKCE, receives its HTTPS callback, and stores tokens natively. Refresh happens before an expired-token request; **Disconnect Authorization** revokes the refresh token and removes local tokens. API Key mode requires a key and User No belonging to the same account; it never falls back to OAuth.

Manage API keys at https://eraser.550wai.com/api/ and account credits at https://eraser.550wai.com/purchase/. The English interface is fixed, not a language switch. Transport uses the existing Open API at `https://www.550wai.cn/open/`; the interface region does not imply different upload routing or data residency.

## Usage

Choose an action, select one file or paste one share URL, and approve credit usage before processing. Images support PNG, JPEG, and WebP up to 50 MiB. Local videos support MP4 and MOV up to 200 MiB; accepted metadata must be at most 10 minutes and 1920×1080 (portrait supported). Video uploads are buffered in memory. Leave the rectangle empty for full-frame processing, or specify `[x1,y1,x2,y2]` in pixels.

Retain the operation ID when investigating an uncertain submission. Do not submit again with a new ID until the existing task outcome is known. Accepted tasks are not completed tasks: use **Check Task Status**, or the image/video task action with the returned task ID. Status checks are manual, with no automatic polling. The result screen shows status, task ID, failure details, and an **Open Result** action for validated completed-result URLs. JSON is available only through the advanced copy action. Opening a link does not verify that a file was saved. A blank video rectangle explicitly submits all four coordinates as zero; a validated advanced rectangle overrides them.

## Local validation

Run `npm ci`, `npm test`, `npm run typecheck`, `npm run lint:source`, `npm run lint`, and `npm run build`. Strict lint checks Store metadata as well as source; an invalid author blocks publication even when compilation succeeds. Builds use distribution mode and write to `staging/build`, without importing a development extension into Raycast. The repository build prepares and formats the bundled API source from the canonical distribution source; standalone review sources must include `src/generated/api.mjs`. Never submit credentials or private media in screenshots.

This is a review candidate, not an approved Store release. The image, video, and share-link views were opened in the real Raycast 2.6.2 client on 2026-10-05. Three real captures in `metadata/` use 2000×1250 PNG with a consistent neutral border; no UI text or results were fabricated. This UI check does not replace end-to-end authorization, paid processing, or Store approval.

## Independent regional candidates

This standalone Store submission contains the English/global extension only. Run `npm run build` here. The separate China self-distribution product is maintained in the upstream source repository; its regional packager is not shipped in this Store checkout. Do not run `npm run build:regions` here. Version remains 3.1.5; compilation is not Store approval.

Uncertain paid submissions retain the operation ID on a dedicated result view. OAuth offers receipt lookup. The legacy API Key API has no lookup by operation ID: check website task history or contact support, recover a task ID, then use Image Task / Video Task. Do not resubmit with a new ID. This limitation is explicit; automatic API Key recovery is not claimed.

OAuth uses the shared `https://www.550wai.cn/media-api/global/v1` HTTP API. The first explicit connection dynamically registers a public client (no secret); LocalStorage retains only its public ID, never tokens. The callback is `https://raycast.com/redirect?packageName=550w-media`. HTTPS DCR is supported by the current server policy; no Server changes were made. For uncertain submissions or pending share resolution, use **Recover Original Operation** with the original operation ID. There is no automatic paid retry or polling. OAuth video admission is asynchronous; the server verifies video metadata, whereas API Key mode retains the existing upload/metadata/submission sequence.
