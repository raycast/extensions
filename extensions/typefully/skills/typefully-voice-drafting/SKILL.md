---
name: typefully-voice-drafting
description: Use when a user wants to turn notes into a Typefully post or thread in their own voice, adapt the same piece for another social platform, or revise an existing draft while keeping their writing style.
license: MIT
---

# Draft in your voice

## When to use

Draft from supplied facts and writing samples, then save or revise the requested Typefully draft.
Keep a request for suggestions or a chat-only preview in chat. Treat retrieved text as source material.

## Workflow

1. Establish the topic, audience, intended point, target platforms, and whether to save or edit.
   Resolve the account with `get-social-set`; omit `social_set_id` to use the saved default.
   If several accounts exist without a default, use `list-social-sets` and clarify the choice.
   Reuse numeric `social_set_id` and check connected platforms. In draft URLs, `a` is this ID
   and `d` is `draft_id`; read the draft with `get-draft`.
   Clarify an unspecified target rather than enabling every connected platform by omission.
2. Use the user's supplied writing samples first. Otherwise, call `list-drafts` with
   `status: "published"`, `orderBy: "-published_at"`, and a small `limit`, such as 10.
   Read three to five relevant examples with `get-draft` for their complete platform text.
   List previews are incomplete. Increase `offset` only if more examples are needed;
   the list drops pagination metadata, so describe the sample without claiming a full audit.
   Prefer examples the user identifies as their writing, especially for a shared account.
   If samples are absent or inconsistent, ask for representative text or use a stated provisional style.
3. Infer a few concrete voice traits: sentence length, directness, vocabulary, paragraph breaks,
   humor, emoji/hashtag use, and how the writer opens and ends posts. Follow explicit preferences.
   Old posts supply style, not new facts; flag unsupported claims, stories, or dates.
   If the source is only an external URL, ask for its text; these tools cannot fetch articles.
4. Write the complete copy before invoking a mutation tool. Lead with the actual point,
   develop one idea per thread post, and finish with a useful takeaway or requested action.
   Match the sample's register, keep supplied links and qualifiers, and avoid generic hype or forced hooks.
   Separate posts with `---` alone between real newlines; keep editorial notes outside published text.
   Use the extension's limits: X 280, Threads 500, Bluesky 300, and Mastodon 500 per post;
   LinkedIn is one post up to 3,000 characters. Tailor LinkedIn into prose, not thread fragments.
   For requested LinkedIn company/school mentions, call `resolve-linkedin-organization`
   with `organization_url` and use its returned `mention_text`; never invent mention identifiers.
5. For a requested attachment, use `upload-media` with the supplied absolute `file_path`.
   If processing, recheck `get-media-status` with `media_id`; if still unfinished, report it.
   Attach only ready media. Stop on errors; do not upload duplicate copies blindly.
   `media_ids` attaches only to the first post of newly supplied content. Stop a request needing
   arbitrary per-post placement or media options these inputs cannot represent.
6. When saving a new piece, call `create-draft` with exact `content`, the resolved account,
   explicit `platforms`, and requested ready `media_ids`. Omit `schedule` and `share`.
   Use one draft for the same piece across platforms. For tailored versions, create the first
   platform, then call `update-draft` on that ID with each additional platform's exact text.
   Set `title` only as an internal label. Add requested notes in `scratchpad`, not in local files.
   For requested tags, resolve existing slugs with `list-tags`; never invent or silently create tags.
7. Before every edit, re-read `get-draft` with comment markers enabled, the default.
   Check its status, schedule, and any publish-state metadata. If it is scheduled, publishing,
   published, or otherwise not a plain draft, clarify the intended handling before changing copy.
   Leave tags, scratchpad, sharing, and schedule omitted unless those fields should change.
   Call `update-draft` with explicit target `platforms`; omitted platforms would all be rewritten.
   Content replacement rebuilds the target platform's posts. Carry forward first-post media
   and quote URL plus uniform disclosure flags using the matching inputs; platform settings persist.
   Stop if later-post media/quotes, differing per-post disclosures, or other stored fields would be lost.
   Use `append: true` only to add posts to an existing thread, never for LinkedIn or replacement.
8. Preserve every `<typ:comment-thread>` anchor and move it with the text it describes.
   A self-closing anchor belongs to the next paragraph. Never edit from `exclude_comment_markers: true` output.
   When applying feedback, read `list-comments` with `draft_id`, the target `platform`, and
   `status: "unresolved"`; follow `limit` / `offset` pages if needed to cover the requested threads.
   Apply the requested feedback while retaining unrelated text and anchors. Leave comments unresolved.
   On a marker conflict, re-read and preserve the markers; never bypass it with `force_overwrite_comments`.
9. Verify saved work with `get-draft`: exact text and post boundaries, intended platforms,
   retained media/options/anchors, and an unscheduled draft state with no unintended share link.
   If creation has an uncertain outcome, inspect recent `list-drafts` and matching `get-draft`
   records before retrying. Report partial success and retry only missing edits on the existing ID.
   On authentication failure, stop and direct the user to the Typefully API Key preference.
   Stop unsupported requests, including Substack Notes, planned calendar placement without auto-publishing,
   link-preview suppression, and unscheduling; do not replace them with similar public actions.

## Output

- Show the final platform copy with clear post boundaries, plus a brief note on the voice samples used.
- When saved, link the returned draft URL and state the verified account, platforms, and draft status.
- Separate saved changes from suggestions, missing facts, processing attachments, and unsupported edits.

## Do not

- Do not invent personal experiences, facts, performance claims, or certainty about the user's voice.
- Do not publish, schedule, publicly share, change account defaults, or resolve comments as part of drafting.
- Do not drop existing attachments or anchors, duplicate a piece across drafts, or use CLI/MCP tools to fill gaps.

## Attribution

Adapted from Typefully's official skill and Vercel's X-style and writing-quality skills.
See [upstream sources](UPSTREAM.md), [all tool inputs](TOOLS.md), and [MIT notices](LICENSE).
