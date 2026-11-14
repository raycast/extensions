<div align="center">
    <br/>
    <br/>
    <img src="./assets/icon.png" alt="The Forest" width="100"/>
    <h3>The Forest</h3>
    <p>Rediscover the joy of getting lost on the web</p>
    <br/>
    <br/>
</div>

The Forest is a Raycast extension that opens a random website from [theforest.link](https://theforest.link/) and keeps a lightweight local walk history so you can quickly revisit or copy previous discoveries.

## Commands

- **Go for a Walk** opens a random website planted in The Forest.
- **View Walk History** lists up to 100 previous walks with actions to reopen or copy their URLs.
- **Plant a Website** submits a website for consideration using The Forest's public planting form.
- **Open The Forest** opens the original interactive forest.

## AI tools

- **Take a Walk** discovers a random site, saves it to history, and returns a link.
- **Get Walk History** retrieves up to 100 previous discoveries.
- **Clear Walk History** clears saved discoveries after user confirmation.
- **Plant Website** submits a URL after showing exactly what may become publicly discoverable.

## Website Addresses

Plant a Website and the Plant Website AI tool accept bare domains (`example.com`) and domains with paths or ports (`example.com:8443/blog`). Bare addresses use HTTPS; explicit `http://` and `https://` addresses keep their scheme. Surrounding whitespace is trimmed. Addresses with internal whitespace, backslashes, embedded login credentials, unsafe schemes, or malformed hosts/ports are rejected. Localhost and IPv6 addresses are also supported.

## Development Checks

Run `npm ci`, `npm test`, `npm run lint`, `npx tsc --noEmit`, and `npm run build`.
Tests cover normalization, form validation/submission, AI confirmation, and the encoded planting request using fixtures and mocked HTTPS. They send no real planting requests. Native Raycast UI and live service behavior require separate validation.

## Product plan

### Version 1

- Keep the core walk one keystroke away with a no-view command.
- Resolve and save each walk locally so discoveries can be revisited later.
- Match the website's planting flow in a native, validated Raycast form.
- Preserve an escape hatch to the original interactive experience.

### Follow-ups

- Consider favorites if the walk history proves useful and people want permanent curation.
- Add Raycast AI tools only if they preserve the site's intentionally algorithm-free discovery experience.
- Revisit submission handling if The Forest publishes a documented API contract.
