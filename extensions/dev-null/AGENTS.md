# /dev/null — agent notes

A macOS Raycast extension that posts commits to [/dev/null](https://dev-null.sh), a social network for developers. A commit is text plus up to 3 images. There is no login or API token. Each commit is signed locally with an SSH key that is on the user's GitHub account, and /dev/null checks the signature against the public keys GitHub publishes for that user.

There are two ways to post: the **Create Commit** form and the **post-commit** AI tool. Both go through `postCommit()`. Four more commands read /dev/null as a guest, with no signature: **View Profile**, **Go to My Profile**, **My Commits** and **Search Commits**.

## Layout

- `src/create-commit.tsx`: the form. The draft and image paths are cached (`useCachedState("draft")`, `useCachedState("imagePaths")`). The image picker stays hidden until **Attach Image…** (⌘N), unless cached images are restored, and is hidden again by **Remove Images** (⌃⇧X). A ref (`committing`) is set before the first `await` in submit, so a second ⌘⏎ during the image check can't post twice. After a successful commit the form stays open, so the success toast and its **Open Commit** action stay on screen. The same commit stays reachable from the Action Panel as **Open Commit** (⌘O), which appears only once a commit has posted. The draft and images are cleared only if the user didn't change them while the commit was posting. The navigation title shows the server's own count (`n of 4,000`).
- `src/tools/post-commit.ts`: the AI tool. Its `confirmation` runs `prepareCommit()` first, so a commit /dev/null would refuse fails before the user is asked. It then shows the text as the server will save it (`normalizeBody()`), the image names (or **None**), and a preview of the first image, written from the hashed bytes to a temporary file named by its hash (`writePreview()`), so the preview is what will be posted and never changes under an open confirmation. Previews older than an hour are removed on the next write. It saves the approved images' hashes, and `postCommit()` refuses (`approvedImageHashes`) if a file changed after the user approved. Raycast runs the confirmation and the tool in **separate processes** (verified live 2026-10-20: a module-level map came back empty, `approval: "not recorded"`), so the hashes go through `LocalStorage`, one record per distinct commit (a hash of the text and paths), which the tool removes when it runs. A record expires after 10 minutes, and each confirmation deletes expired ones first, so a canceled confirmation doesn't linger. It reads each expired record again just before removing it, so a record another confirmation refreshed in the meantime is kept. If there is no record, the commit is still checked, just not compared with what was shown (fail-open, so posting still works if confirmations are skipped). Two confirmations open at once for the *identical* commit share a record; the later one wins. The `Checked commit` log line says which happened (`approval: "matched"` or `"not recorded"`); a post from the form, which has no approval step, logs `"not used"`. The tool passes `null` for a missing record to mark the difference. It returns `{ url, pendingReview, imagesAttached }`.
- `ai.yaml`: the AI instructions and evals.
- `src/view-profile.tsx`, `src/my-profile.tsx`, `src/my-commits.tsx`, `src/search-commits.tsx`: the reading commands. Their views live in `src/components/profile.tsx`, in one file because a profile lists commits and people, and each of those opens a profile; split, they would import each other. **View Profile** takes an optional username (a bare name, `@name`, or a profile or commit URL); without a valid one it searches people. **Go to My Profile** and **My Commits** use the `username` preference, or else the account of the last commit, which `rememberUsername()` (`src/username.ts`) reads from the new commit's URL and keeps in `LocalStorage` after every post, as JSON because `useLocalStorage()` parses what it reads, from the form and the AI tool alike.
- Create Commit's **Attach Image from Clipboard** (⌘⇧V) attaches the clipboard's image. The actions say "image", not "attachment", because a CLI commit can carry only images (JPEG, PNG, WebP). A copied file (`Clipboard.read().file`) with a JPEG, PNG or WebP extension is attached as it is; anything else goes through `saveClipboardImage()` (`src/lib/clipboard.ts`), which has AppKit, via `osascript -l JavaScript`, read the clipboard's image in whatever type it came as and write a PNG to `environment.supportPath/pasted`. Pasted files older than a week are removed the next time image data is saved this way, unless still attached. Before attaching, it checks the 3-image limit again against the form's current images, since more may have been picked while the paste was being saved. It is not on ⌘V: Raycast gives an extension no paste event, so an action on ⌘V would take text paste away from the message field. The tests use a private named pasteboard, never the user's clipboard.
- Create Commit's **Selected Text** preference (`useSelectedText`) puts the frontmost app's selection into the commit when the form opens: in place of an empty draft, below a draft already started, and not at all if the draft already contains it.
- `src/lib/devnull.ts`: the protocol (`prepareCommit()`, `postCommit()`).
- `src/lib/body.ts`: the server's rules for the text, including its exact character count.
- `src/lib/images.ts`: the server's rules for images.
- `src/lib/api.ts`: reading profiles, commits, followers and search. Profiles and commits come from the v1 API (`/api/v1/users/{username}`, `…/commits`, `…/followers`, `…/following`), cursor-paginated. **Search has no v1 endpoint,** so it uses the JSON endpoints the website's own search box calls (`/search/users`, `/search/commits`). Those return the stored records rather than API resources, with no `html_url` and a commit's author under `user`, so `searchUsers()` and `searchCommits()` rebuild the links. They can change without notice. Commit search is limited to 15 a minute per address (`RateLimiter::for('search')`), so **Search Commits** waits for a pause in typing and for 3 characters, below which the server answers nothing (`CommitSearchQuery::MINIMUM_TERM_LENGTH`); people search allows 120 a minute and returns at most 8.

The files in `src/lib/` have no Raycast imports, so they run under plain Node and Vitest.

## The protocol

`postCommit()` ports the official script at https://dev-null.sh/commit. That script is the reference implementation, so re-read it before changing the protocol. This port leaves out `--reply`.

0. **Check.** `prepareCommit()` refuses anything the server would refuse (see the next section) before any key is looked up, so an invalid commit is never signed or sent. It also reads each image once. Those same bytes are hashed, signed and uploaded.
1. **Candidates.** It collects `ssh-ed25519`/`ssh-rsa` public keys from each reachable SSH agent (`ssh-add -L`) and from every `~/.ssh/*.pub` that has a private key beside it. It removes duplicates by `"<type> <base64>"`. The first source wins, so a key that is in an agent is always signed through that agent.
2. **Lookup.** It POSTs the candidate list, one key per line as `text/plain`, to `/api/cli/key-lookups`. The first line of the answer names the key to use. **If that key is not one of the candidates, it refuses to sign.**
3. **Sign.** It runs `ssh-keygen -Y sign` over the payload `<unix time>\n<16-byte hex nonce>\n<reply-to, empty>\n<message>`, in the `devnull-commit` namespace. With images, a line of their comma-separated SHA-256 hashes, in upload order, goes before the message, and the namespace is `devnull-commit-images`.
   - **Agent key:** it passes a `.pub` file and sets `SSH_AUTH_SOCK` to that agent's socket.
   - **File key:** it passes the private key path and unsets `SSH_AUTH_SOCK`.
   - ssh-keygen gets no TTY, so a key with a passphrase that isn't in an agent fails, and the error tells the user to run `ssh-add`.
4. **Post.** It sends the result to `/api/cli/commits` with the armor-stripped base64 signature in `X-SSH-Signature`.
   - **Text only:** the payload is the raw `text/plain` body, with a 30 s deadline.
   - **With images:** the body is a multipart form, as the script sends it: a `payload` file named `commit`, then `images[]` files named `image-1`, `image-2`, and so on. The deadline is 600 s.

Every `/api/cli/*` response is plain text, including a 422 validation failure (`bootstrap/app.php`). A non-2xx body, trimmed, becomes the error message. Success is `Committed: <url>`, with ` (pending review, …)` appended when the commit is held (`app/Http/Controllers/Cli/CommitController.php`). `parseCommitAnswer()` turns that into `{ url, pending }`.

## Client-side validation mirrors the server

Server source: https://github.com/nunomaduro/dev-null.sh. The repository has no license file, so `src/lib/body.ts` is written independently and only matches its rules. It does not copy its code. Each rule names the server file it has to stay in step with:

- **Text** (`body.ts`): 1 to 4,000 characters after trimming, turning `\r\n` and lone `\r` into `\n`, and collapsing 3+ blank lines in prose, counted in code points (`mb_strlen`). A prose link counts as at most 23 characters; a link inside code counts in full. A bare domain counts as a link only on the allowlisted TLDs (`app/Services/Urls.php`). A link over 2,048 characters is refused. Text over 40,000 characters after normalizing is refused; the server normalizes before it checks (`CreateCliCommitRequest::prepareForValidation`). A lone UTF-16 surrogate is refused, because the payload must be UTF-8.
- **Images** (`images.ts`): at most 3. Each must be JPEG, PNG or WebP, judged by its bytes and not its extension; at most 10,240,000 bytes, the official script's limit; and at most 6,000 pixels on a side (`app/Actions/CreateCommitImages.php`). Both are checked on the bytes that were read, the same ones hashed and uploaded: the size on the buffer, the dimensions by `imageSize()`, which reads them from the header the way PHP's `getimagesize()` does, as the server does (`app/Actions/CreateImageFiles.php`). Like `getimagesize()`, it ignores EXIF rotation. It agreed with `sips` on 166 real files: baseline and progressive JPEG, PNG, and WebP in all three forms (VP8, VP8L, VP8X with alpha and animation). The CLI endpoint takes no alt text.

If the server changes a rule, change it here too. Otherwise the extension refuses commits the server would take, or sends ones it will reject.

## Gotchas

- **Raycast doesn't inherit the shell's `SSH_AUTH_SOCK`.** `agentSockets()` also asks launchd for macOS's own agent socket (`launchctl getenv SSH_AUTH_SOCK`), and checks the default 1Password and Secretive socket paths. A `~/.ssh/*.pub` that can't be read is skipped, so it doesn't hide usable keys. If an agent isn't found, add its socket path to `AGENT_SOCKETS`.
- **Binaries are called by absolute path** (`/usr/bin/ssh-add`, `/usr/bin/ssh-keygen`, `/bin/launchctl`), because Raycast's `PATH` is minimal. That is why the extension supports macOS only.
- **The key lookup reads only the first 20 lines** (`CreateKeyLookupRequest::MaxKeys`). The official script is subject to the same limit.
- **Signing can wait for Touch ID or an approval prompt** from the agent, so the signing timeout is 120 s. Listing an agent's keys (`ssh-add -L`) times out after 10 s, so a wedged agent doesn't stop the others and `~/.ssh` from being tried.
- **Request deadlines also cover reading the body.** Node's `fetch` didn't reliably abort a body read that stalled after the headers arrived (it hung at 12 s and 30 s deadlines in a local test). `request()` therefore races `response.text()` against the same `AbortSignal`.
- **Logging goes through the `log` option**, which keeps the lib free of Raycast imports. The command and the tool pass `logger.log`, which prints only when the user turns on Debug Logging. The lib logs the image count and total size, whether the AI approval was compared (or not used, from the form), key counts per source, each request's method, URL, status, duration and size, and the key type and route used for signing. It never logs the signature, a key, or the message.

## The AI tool and its evals

- **Mocked evals prove only their assertions.** `mocks` replace the tool, so its validation and confirmation never run in an eval. The Vitest tests cover the validation and reading in `src/lib/` (with `fetch` faked for `api.ts`), the changed-image refusal, and the confirmation's cleanup of expired approvals (`src/tools/post-commit.test.ts`, with `LocalStorage` faked). Nothing automated checks what the confirmation shows, or that the tool receives the record it saved. Before trusting a change, ask the tool live in a new AI Chat, then use **Copy Eval**.
- **An image attached in AI Chat reaches the tool as a file path.** Verified live on 2026-10-20: an image attached to the message was posted with the commit (`Checked commit { images: 1 }` in the log).
- **Copy Eval works only on a conversation with a single prompt.** On a longer one it fails with "Start a new conversation with a single prompt to copy an eval." It also drops the attachment from `input` and records the arguments with `eq` on an array (`imagePaths: { eq: [] }`), which fails (see below). Don't paste an eval copied from an attachment post as is: give the image as a path in `input` and assert `imagePaths.0`.
- **The reply's link needs an example, not a rule.** Live AI Chat answered "Posted to [/dev/null](…)", hiding the URL, even when told to print it in full. `ai.yaml` now shows the exact reply to copy (`Posted: <url>`), and eval 1 fails on any other link text.
- **The model sends `imagePaths: []` or blank strings** for "no images". `commitOf()` and `prepareCommit()` drop blank paths.
- **Eval syntax:** `eq` on an array argument fails even though the docs show it. Use dot notation (`imagePaths.0`). An eval-level `not: { callsTool: { arguments } }` reports only `[object Object]`. `--only` is 1-based.
- **Known failing eval:** "post my screenshot about the new release" with no path. The model posts the text without an image instead of asking for one. Three rounds of instruction wording didn't fix it. The guard is the confirmation, which always lists **Images**, showing **None** when there are none.

## Verifying a change

- `npm test` runs the Vitest tests for `src/lib/` and `src/tools/`. They build real PNGs, and JPEG and WebP headers, to check the size limits.
- `npx ray evals --non-interactive` runs `ai.yaml` remotely against the mocks. Nothing is posted.
- **To test signing and upload without posting anything,** compile `src/lib/` on its own and point `postCommit()` at a local server:

  ```bash
  npx tsc --ignoreConfig src/lib/devnull.ts src/lib/body.ts src/lib/images.ts src/lib/api.ts --outDir <scratch>/out --module commonjs --target ES2023 --types node --skipLibCheck
  ```

  Call `postCommit({ message, imagePaths }, { baseUrl: "http://127.0.0.1:<port>", home: <scratch home with a throwaway key>, agentSockets: [] })`. The fake server should:
  - verify `X-SSH-Signature` with `ssh-keygen -Y verify -n devnull-commit` (or `-n devnull-commit-images` with images);
  - for images, parse the form (`new Request(...).formData()`) and compare each file's SHA-256 with the payload's hash line;
  - split the payload on only its first three newlines (four with images) and keep the rest as the message, as the server's `explode(…, 4 or 5)` does.

  `agentSockets: []`, or a throwaway `ssh-agent -a <short path>`, keeps the test away from the user's real agents. A real post needs a key that is on a /dev/null user's GitHub account, so only the user can make one.

## House style

The extension follows Chris's Raycast house style:
- Failure toasts go through `failToast` from `@chrismessina/raycast-kit`, which adds the Copy Error action.
- Logging goes through `@chrismessina/raycast-logger`, with the `verboseLogging` and `strictRedaction` preferences typed verbatim.
- Shortcuts use `Keyboard.Shortcut.Common`.
- Copy is in US English.
- `madge` isn't a dev dependency: npm refuses to install madge 8 next to TypeScript 6, because madge lists TypeScript 5 as a peer. madge itself runs fine on this code, so check for import cycles with `npx -y madge@8 --circular --extensions ts,tsx --ts-config tsconfig.json src`.
