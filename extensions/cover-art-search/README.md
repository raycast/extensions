# Cover Art Search

Search IMDb for high-quality cover art for movies, TV shows, anime, and games — then copy it to your clipboard, or
send it straight to a Capacities object as its cover image.

Results come from IMDb's own search-suggestion endpoint (the same one imdb.com's search box uses), covering
movies, TV, anime, and video games in a single search, each with an official IMDb poster.

## Usage

1. Open **Search Cover Art** in Raycast
2. Type a title — movie, show, anime, or game
3. Browse the results (each shows its type and image dimensions, e.g. "Movie · 1021×1500")
4. Use the actions on a result to:
   - Copy the cover image to your clipboard
   - Add it as a cover image in Capacities (optional — see below)
   - Copy the image URL
   - Open the image in your browser
   - View the title's page on IMDb

Searching requires no API key or account. Everything above works out of the box.

## Optional: Capacities Integration

The **Add as Cover in Capacities** action uploads the selected image into your Capacities space and links it as the
cover image of the matching object.

This assumes your space has a custom object type for your media (movies, shows, games) with an **object-link
property** pointing at an image. If you track your watchlist that way, this will fit; if not, the rest of the
extension still works without any of this configured.

### Setup

1. In the Capacities desktop app, go to **Settings → Capacities API** and generate a token with the `api:read` and
   `api:write` scopes.
2. Open this extension's preferences in Raycast and fill in:

| Preference               | Required | What it is                                                                              |
| ------------------------ | -------- | --------------------------------------------------------------------------------------- |
| **Capacities API Token** | Yes      | The token from step 1                                                                   |
| **Object Type(s)**       | Yes      | Comma-separated object type names to match against (e.g. `Media, Games`)                |
| **Cover Property**       | Yes      | The object-link property on those types that should hold the cover (e.g. `Cover image`) |
| **Image Collection**     | No       | An image collection to file the uploaded cover into (e.g. `Cover Images`)               |

All of these are matched by the names you see in the Capacities UI — no internal IDs needed. Type names can be
singular or plural (`Game` and `Games` both work), and each listed type can have its own separate cover property.

### What it does

When you run the action on a result, the extension:

1. Searches your space for an object of your configured type(s) whose title matches the result
2. Creates an image object from the IMDb picture, named `{title} cover`
3. Sets its category to `Cover`, and files it into your configured collection if you set one
4. Links it as the matched object's cover property

It always uses the **top search match**. If several objects have similar titles, double-check the result — the
success message names the object it updated.

## Troubleshooting

- **No results**: Try a broader or differently-spelled query. Individual TV and podcast episodes are filtered out,
  since they aren't cover art for a title.
- **"No object type named … exists"** / **"has no object-link property named …"**: The name in preferences must
  match the Capacities UI exactly (case doesn't matter). Check for typos and confirm the Cover image property exists.
- **"No … object in Capacities matches"**: No object of that type has a title close enough to the search result.
  Create the object first, or rename it to match.
- **Search stops working entirely**: This uses an unofficial, undocumented IMDb endpoint (IMDb offers no public
  search API), so it can change without notice. Please open an issue if it breaks.
