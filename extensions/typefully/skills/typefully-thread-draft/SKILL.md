---
name: typefully-thread-draft
description: Use when a user wants a social thread drafted in their own voice using Typefully writing examples, optionally saving it as an unscheduled draft.
---

# Thread drafting

## When to use

Use to turn an idea or supplied source material into a thread in the user's voice.
Offer the text in chat or save an unscheduled draft when requested.
Use only this extension's tools named below.

## Workflow

1. Establish the idea, audience, platform, intended takeaway, and source material.
   Call `get-current-user` and `list-social-sets` to resolve the intended identity.
   Call `get-social-set` with the chosen `social_set_id` to verify connected platforms.
   Clarify ambiguous accounts or platforms before saving anything.
2. Use a writing sample supplied by the user, or call `list-drafts` with that
   `social_set_id`, `status: "published"`, and a small `limit` for voice examples.
   Call `get-draft` with each selected `draft_id` to read its full content.
   If no examples are available, ask for a sample or label the voice as provisional.
3. Identify observable style choices: sentence length, vocabulary, structure,
   use of examples, and level of formality. Apply these without copying prior posts.
   Keep the user's supplied facts distinct from rhetorical suggestions.
4. Draft a clear opening, a coherent sequence of posts, and an appropriate ending.
   Each post should contribute a distinct point. Preserve supported qualifications
   and source links; flag claims that still need evidence.
5. Return the proposed thread if the user requested drafting only. When saving
   is requested, call `create-draft` with `content`, the chosen `social_set_id`,
   explicit `platforms`, and a useful `title`. Separate posts with `---` on its own line.
   Omit `schedule` and `share` so the result stays an unscheduled private draft.
6. For an explicitly requested revision to an existing draft, first call `get-draft`.
   Verify that it is an unscheduled draft and preserve comment markers and unrelated
   content. Call `update-draft` with only the requested content and fields.
   If it is already scheduled or published, clarify the intended destination first.
7. Fetch the saved draft with `get-draft` to verify content and draft status.
   If the write is uncertain, inspect existing drafts before retrying a creation.

## Output

- Target account and platform, plus the voice examples used.
- The thread as numbered posts with source links where relevant.
- Any unsupported claims or questions that need the user's input.
- Draft link and verified status when saved, or a clear chat-only proposal label.

## Do not

- Do not publish, schedule, generate a share link, or select extra platforms by default.
- Do not invent personal experiences, facts, quotes, or results to imitate a voice.
- Do not overwrite comments, scheduled posts, or published content during drafting.
