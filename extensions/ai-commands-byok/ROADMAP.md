# Roadmap

Status: v1 submitted to the Raycast Store on 5 Sep 2026
([raycast/extensions#30802](https://github.com/raycast/extensions/pull/30802)).
No feature work on `main` while that review is open. Fixes the reviewer asks
for go straight to the PR branch.

## v2, in this order

1. **Token count and rough cost per run** in the result sidebar. Read `usage`
   from both SDK responses; price table per model id, editable in one place.
2. **Ask Selected Text.** A command with a Raycast `arguments` text field. The
   user types the question after the command name in root search; the command
   sends the selection plus the question and shows the answer. Same feel as
   Raycast's own "Ask AI about selected text".
3. **Refine.** Action in the result view: type "shorter" or "more formal" and
   the reply is reworked, keeping the original selection as context. No need to
   reselect.
4. **Export and import commands as JSON.** `LocalStorage` does not sync between
   Macs. One file for backup, sharing, and moving machines.
5. **History.** Keep the last ~20 results with command name and time, re-paste
   from there.

## Later

- **Custom API base URL** for OpenAI-compatible servers (Ollama, OpenRouter,
  Groq, Mistral). One preference field. Add once the store listing has users.
- A **Translate** preset once arguments exist.

## Decided against

- Run-time forms for `{argument …}` placeholders. Defaults are substituted
  silently instead; the owner does not find the forms useful.
- Colored inline highlights. Raycast markdown cannot color text; the SVG image
  workaround was built, tried, and removed because the text stops being
  selectable. Bold words stay.
- A diff-block view. Raycast does not color ```diff blocks.
