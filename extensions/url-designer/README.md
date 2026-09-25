# URL Designer

URL Designer is a Raycast extension for collecting URL patterns and copying them as an implementation prompt.

## Use the Create Prompt Command

1. Open `Create Prompt` in Raycast.
2. Type a URL pattern, such as `blog/posts/[uuid]`.
3. Press Enter to add the pattern. The command removes spaces and adds a leading `/`.
4. Select a saved pattern and press Cmd+E to edit it. Press Enter to save the change.
5. Select a saved pattern, then use Move up or Move Down to change its position.
6. Press Cmd+Shift+C to copy all saved patterns as an implementation prompt.

The command stores saved URL patterns in Raycast local storage. It prevents duplicate patterns.

## Shortcuts

| Action            | macOS         | Windows         |
| ----------------- | ------------- | --------------- |
| Add or save a URL | Enter         | Enter           |
| Edit a URL        | Cmd+E         | Ctrl+E          |
| Move a URL up     | Cmd+Ctrl+Up   | Ctrl+Shift+Up   |
| Move a URL down   | Cmd+Ctrl+Down | Ctrl+Shift+Down |
| Remove a URL      | Ctrl+X        | Ctrl+D          |
| Copy the prompt   | Cmd+Shift+C   | Ctrl+Shift+C    |

## Generated prompt

The Copy Prompt action copies the saved URL patterns, one pattern per line. It then adds:

```text
implement these URL contracts in the app
```

## Credits

This extension is inspired by [Linksy](https://linksy.sh) by [@fernandorojo](https://x.com/fernandorojo).
