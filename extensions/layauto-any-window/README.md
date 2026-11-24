# LayAuto 4 Any Window for Raycast

Search every window, Deep Window (browser tabs, terminal sessions, Codex tasks), and session that
LayAuto 4 knows about, most recently used first, and bring the one you pick to the front.

Requires LayAuto 4 with Any Window turned on. Download the current release from
<https://updates.layautoapp.com/latest/LayAuto4.dmg>. Results, ranking, pinyin matching, and activation come
from LayAuto 4 itself through the `layauto` tool inside `LayAuto 4.app/Contents/MacOS`.

- Assign a hotkey to **Search Windows** to open the list directly.
- Add **Search Windows** as a fallback command to search from Raycast's root search.

## Development

```sh
npm install
npm run dev     # loads the extension into Raycast
npm run lint
npm run build
```
