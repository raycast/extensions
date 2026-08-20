# Design notes

Known structural debt in this extension, kept next to the code it describes so
whoever picks it up finds it. Not a TODO list — each entry names a real seam, why it
exists, and the constraint that would bite someone changing it.

---

## Ask vs. Recents — two mental models over one dataset

**Verdict: real structural seam. Logged, not fixed — ships as-is for now.**

`src/views/chat.tsx` renders a single conversation as a FLAT LIST of Q&A rows —
newest first, each row labelled a "Result" (`List.Section title="Results"`,
`:127` — the section title, not this entry's line number). `src/recents.tsx` renders
CONVERSATIONS. Both read the exact same underlying data: `ask.tsx` writes every
conversation's `chats` array to `recents_v1` on every change (the persistence effect
at `src/ask.tsx:134`). Same storage, two different mental models layered on top.

**Consequence:** a follow-up reads as a new search result rather than a turn in a
thread — asking a question about "Which one…" pushes it above "What's the diffe…"
in the list rather than appending it below as the next line of a transcript.
"Results 2" (the section subtitle) is conversation-shaped data described in search
language. And the action panel (`src/views/chat.tsx`) optimizes for acting ON one
answer — Copy Answer, Pin, Regenerate — rather than for continuing the conversation;
Bug 3 (asking a follow-up wasn't the primary action) was a direct symptom of this,
now patched at the action-panel level without touching the underlying list shape.

**Root cause:** this extension is a fork of the ChatGPT Raycast extension, whose Ask
view was built as a question/answer SEARCH UI — hence "Results," hence newest-first
(most relevant result on top), hence a per-answer action panel. Merging
Conversations/History/Saved Answers into the single Recents view made the seam MORE
visible, not less: Recents now speaks fluently in conversations (titles, pin/archive,
continue), while Ask still speaks in results underneath the same data.

**Options worth considering later:**

- Reverse Ask's sort to oldest-first so a conversation reads top-to-bottom as a
  transcript, matching how every chat UI (including Recents' own mental model) reads.
- Replace "Results N" with conversation framing ("Turn N of conversation," or drop
  the count entirely in favor of a running transcript).
- Go further: render a conversation as a single scrolling detail view instead of a
  list of selectable rows — closer to how Claude's own chat surfaces work, and closer
  to what Recents already implies about the data.

**Where it would plug in:** `src/views/chat.tsx` (the sort, the section title, the
per-row action panel) and possibly `src/views/answer-detail.tsx` if the detail view
becomes the primary transcript surface rather than a per-row preview.

**Load-bearing constraint for whoever picks this up:** the sort at
`src/views/chat.tsx:31` (`[...data].sort(...)`, copy-before-sort) is deliberate — an
in-place sort there previously CORRUPTED stored transcripts, because `data` is the
same array `src/ask.tsx` persists to `recents_v1` as `conversation.chats`, and
sorting it in place both reversed the stored order and sent Claude the turns
backwards on the next request. Any future reordering (including "flip to
oldest-first" above) must keep copying before sorting, not just change the compare
function.
