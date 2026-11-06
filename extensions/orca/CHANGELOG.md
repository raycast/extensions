# Orca Changelog

## [Reliable Prompt Delivery] - 2026-10-28

- A saved prompt that starts a new agent is now submitted by Orca once the agent is up, instead of being typed in while it starts — it no longer sits in the input without Enter, or lands in the shell
- Errors from Orca show what Orca said, not the command line with the whole prompt in it
- An Orca too old for a command asks you to update it; the extension now needs Orca 1.4.229 or later

## [Finished Agents and Grouping by Status] - 2026-10-22

- Agents that finished but you have not looked at yet get their own section under the waiting ones
- Mark an agent's worktree as read right from the list
- The counts subtitle in the root search now includes agents that finished unseen
- New Group List By preference: group the list by project or by status
- The icon on the left of each row now shows its state; the project moves next to the branch
- With nobody waiting, the root search subtitle shows the counts instead of going blank

## [Initial Version] - 2026-10-02

- List every agent running in Orca, grouped by project, with the ones waiting for input on top
- Show what each agent is blocked on, how long it has been waiting, its task and its last reply
- Keep a live count of waiting agents in the root search, refreshed in the background
- Save a prompt as a named command that starts an agent in Orca, optionally in a fresh worktree
- Append clipboard, selected text, browser tab or typed text to a saved prompt at launch
