# Brainuv

A tiny manual attention scheduler — like libuv, but for your brain.

Brainuv keeps a small ordered queue of active work streams visible and makes rotation between them cheap. It is not a task manager. It exists because people who switch context fast *inside* a stream tend to let *entire streams* stall when attention tunnels elsewhere.

## How It Works

You maintain a short list of streams — broad work contexts like "LLM pipeline", "Review", "Infra cleanup". The top stream is your current focus. When you're done with a chunk of work, hit **Release Queue** — the current stream moves to the bottom and the next one comes up.

## Commands

| Command | Description |
|---------|-------------|
| **Stream Loop** | Main view — see the full queue, promote, reorder, edit, delete |
| **Release Queue** | Rotate the top stream to the bottom (bind to a hotkey) |
| **Release & Show** | Rotate and open the list — instant "done with X, now Y" feedback |
| **Add Stream** | Create a new stream with a title and color |
| **Brainuv Menu Bar** | Always-visible current stream in the menu bar |
| **Toggle Menu Bar** | Show or hide the menu bar icon |
