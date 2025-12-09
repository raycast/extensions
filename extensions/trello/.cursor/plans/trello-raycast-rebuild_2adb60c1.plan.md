---
name: trello-raycast-rebuild
overview: Add Raycast AI commands to chat over Trello data and create cards from natural language using built-in Raycast AI.
todos:
  - id: audit-current
    content: Audit existing commands/utils to understand gaps
    status: completed
  - id: client-layer
    content: Add centralized Trello client with typed helpers
    status: completed
  - id: read-commands
    content: Implement boards/lists/cards detail read commands
    status: completed
  - id: write-commands
    content: Implement add/move/delete card commands
    status: completed
  - id: docs-checks
    content: Update README and run lint/type checks
    status: completed
---

# AI Features for Trello Extension

- Add an AI chat command that loads user’s Trello context (recent cards, lists, board info) and uses Raycast AI to answer questions about them; include actions to open cards in Raycast detail.
- Add a natural-language create-card command that sends the user prompt plus optional board/list hints to AI; parse structured output (title, description, list, due, labels, members) and call existing Trello client to create the card.
- Extend the Trello client/types if needed to fetch richer card metadata (labels, members) for AI context; include safety limits (e.g., top N cards, size caps) to keep prompts small.
- Wire Raycast AI API calls with fallback/toast errors; ensure preferences cover required tokens and any AI config if needed.
- Example: I can ask what tools are down, or what tasks for me is there. Or whats tasks for 'x' employee is there. or past histories of cards form a particular list.
- Add docs to README for the new AI commands, required permissions, and privacy note (data sent to Raycast AI).