# Highlight AI for Raycast

Open Highlight's native search, start a new chat, or open its task composer through Highlight's documented macOS hotkeys. Task creation and message sending remain in Highlight for review.

## What's new

- New **Go To** section that opens Highlight's chat, memories, summaries, plugins and settings directly via its `highlight://` deep links — no Accessibility permission required. Each one can be saved as a Quicklink.

Requires Highlight AI's **Highlight.app**, an already signed-in account, its visible assistant panel, default hotkeys, and Raycast's macOS Automation/Accessibility permissions. Configure the app path if necessary. Highlights (the PDF reader) and Black Highlighter are different apps.

The identity guard requires the confirmed bundle ID `tv.medal.highlight`, bundle name `Highlight`, and executable `Highlight`.

This integration controls Highlight's native UI; it does not expose a remote API, search results inside Raycast, or background capture. A shortcut request is acknowledged as a shortcut request, never as a completed task or search result. Commands fail before typing if the identified Highlight process is not running with a window, or if it loses foreground focus. The extension sends no text, files, credentials, or network requests.

## Commands

**Control Highlight AI** provides Open Highlight Search (⌘K), Start New Chat (⌘N), and Open Task Capture (⌘⇧Space). Use the native Highlight screen to finish each action. If you customized these hotkeys, restore the documented defaults before using the integration.

## Sources

- [Official keyboard shortcuts](https://help.highlightai.com/articles/8511467594-keyboard-shortcuts)
- [Opening the assistant panel](https://help.highlightai.com/articles/4335764389-opening-and-navigating-the-panel)
- [Activity history and its title search](https://help.highlightai.com/articles/2644623958-your-activity-history)
- [Installation instructions](https://help.highlightai.com/articles/3717913325-how-to-download-and-install-highlight)

