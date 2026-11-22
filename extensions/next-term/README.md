# Next Term for Raycast

Jump to any Next Term tab or project, see which agent waits for you, and start Claude Code, Codex, OpenCode, Gemini CLI or Command Code in a project, without switching to Next Term first.

## Commands

- **Search Tabs:** every tab, with its project and state (waiting, working, done, failed). Return brings it forward.
- **Search Projects:** open and recent projects. Return opens one, and ⇧⌘A starts an agent there. Type a name after it (`Search Projects api`) to start filtered, or turn it on as a fallback command in Raycast’s settings: then typing a project’s name in Raycast, when nothing else matches, offers to search your projects for it.
- **Start Agent:** a project, an agent, and an optional first prompt.
- **Agents Waiting:** a menu-bar count of the agents that wait for your decision.
- **Go to Waiting Agent:** brings forward the tab whose agent waits for you. It's a good one for a hotkey.
- **Go to Anything:** Next Term's own switcher, over the window in front.

## Requirements

Next Term 0.11.80 or later, in Applications. The extension uses its `nxtrm` command and `nextterm://` links. If Next Term lives somewhere else, set **nxtrm Path** in the extension's preferences.
