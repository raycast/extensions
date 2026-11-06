# TODO

Where this extension is going next. It ships with the extension on purpose: if one of these is something you want, or want to build, open an issue or a pull request.

API facts below were read from [nunomaduro/dev-null.sh](https://github.com/nunomaduro/dev-null.sh) at `a3b71c3` (2026-10-22): `routes/api.php`, `app/Services/SignedRequests.php`, `app/Http/Middleware/AuthenticateSignedRequest.php`, `config/mobile.php`.

## How the server lets clients in

There are three levels of access, and they decide what's buildable:

1. **CLI, what we use today.** `POST /api/cli/commits`, signed with an SSH key on the user's GitHub account. It can post a commit or a reply (the `reply-to` line of the payload, which our port leaves empty). Nothing else.
2. **v1 API as a guest, no signature.** `GET /api/v1/users/{username}`, `…/commits` (`?replies` for the Replies tab), `…/followers`, `…/following`, and `GET /api/v1/commits/{id}`. Public data only, cursor-paginated: 20 commits or 30 people a page.
3. **v1 API as a signed-in device.** Everything else. A request is signed with an SSH key in the `devnull-api` namespace over `<unix time>\n<nonce>\n<METHOD>\n<path and query>\n<body>`, with `X-Devnull-Timestamp`, `X-Devnull-Nonce` and `X-SSH-Signature`. We already sign this way for commits. The key must first be approved as a **device**: a PKCE flow at `/mobile/authorize`, then `POST /api/v1/devices` with the code.

**The blocker for level 3:** `config/mobile.php` only accepts a `redirect_uri` starting with `devnull://`, the mobile app's scheme, so the code can't come back to Raycast. Raycast's own OAuth client (`OAuth.PKCEClient`, `RedirectMethod.App`) returns to `raycast://oauth?package_name=Extension`, so the fix is that one prefix on the server. The approval flow itself already exists; nothing else on the server changes.

- [ ] Open the server PR adding `raycast://oauth?package_name=Extension` to `redirect_uri_prefixes`, with its test, and ask Nuno whether third-party clients are welcome on the v1 API.
- [ ] Then: a **Sign In** step that makes the device request with the user's SSH key (`fingerprint`, a `device_name` such as "Raycast on <Mac name>", PKCE), and a signer for v1 requests next to the commit signer.

## Now: no server change needed

- [ ] **Reply to a commit.** Fill the payload's `reply-to` line (the official script's `--reply`). Form field or `Reply` action, plus an AI tool argument.
- [x] **View Profile**, **Go to My Profile** and **My Commits**: profile, commits, replies, followers and following, as a guest. "Me" is the Username preference, or else the account of the last commit.
- [x] **Selected text** goes into a new commit, behind a Create Commit preference.
- [x] **Search** people and commits, through the endpoints the website's search box uses. Commit search allows 15 a minute, so it waits for a pause in typing.
- [ ] **Search in the v1 API.** The website's endpoints return raw records and can change without notice. A small server PR could add `GET /api/v1/search/users` and `/search/commits` returning the usual resources, in the guest-or-signed group.
- [ ] **AI tools for public reads:** `get-user`, `get-user-commits`, `get-followers`/`get-following`. Lets "what has @nunomaduro been shipping?" work in AI Chat.
- [ ] **Thread** (from X's `post-thread`): post several commits, each a reply to the last.
- [x] **Replace `sips`** with a PNG/JPEG/WebP header parser (`imageSize()`), checked against `sips` on 166 real files.
- [ ] **Windows support** (a contributor asked). Binary paths and the `\\.\pipe\openssh-ssh-agent` pipe, behind `process.platform`. Unknowns to test on their machine: whether Windows' `ssh-keygen` has `-Y sign`, whether Raycast for Windows runs AI tools, and the agent service is disabled by default.

## Needs device sign-in (blocked on the redirect above)

- [ ] **Log, the home feed.** `GET /api/v1/log/{following|latest|trending}`, with `?since=` giving a "N new" count.
- [ ] **Follow / unfollow**, mute and block (`POST|DELETE users/{u}/follow|mute|block`), and lists of muted and blocked users.
- [ ] **Stars.** Star or unstar a commit; a Starred list (`GET starred`).
- [ ] **Notifications**, then a **menu-bar** command with an unread count (Bluesky has both). `GET notifications`; `GET me` returns `unread_notifications_count`.
- [ ] **Remotes (DMs).** List conversations (`GET remotes`), read (`…/@{u}/messages`), send, react, mark read, archive. Org remotes (group chats) have their own routes. Typing indicators and link previews exist, but aren't worth it in Raycast.
- [ ] **Delete my commit** (`DELETE commits/{id}`), with a destructive confirmation.
- [ ] **Replies to a commit** (`GET commits/{id}/replies`), for a commit detail view.
- [ ] **Poll votes and "pasteis"** (`POST commits/{id}/poll/votes`, `…/pasteis`). Read the server for what pasteis means before building it.
- [ ] **Server-side preview** (`POST commits/preview`). It could replace the client-side copy of the server's rules in `src/lib/body.ts`, at the cost of a request per keystroke-pause.
- [ ] **AI tools on top:** timeline, like (star), follow, reply, send a Remote. Only posting a commit asks for confirmation; starring, following and the like don't need one.

## Not in the API

- Search, for users or commits, is web-only (`/search/users`, `/search/commits`). We use those for now (see above).
- Each user has a public Atom feed at `/@{username}/feed.atom`. It's an option for a guest timeline of one person, but the v1 commits route above is better.

## Open questions

- The server repo has no license file, though its `composer.json` says `"license": "MIT"`. We match its rules and don't copy its code; keep it that way until there's a license file.
- Rate limits: the v1 routes sit under `throttle:api`, and follow, star and message have their own throttles. Check the numbers before polling anything, especially a menu bar.
