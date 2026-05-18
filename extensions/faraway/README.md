# Far Away

Raycast extension to keep track of what time it is for your friends around the world.

## Features

- **Menu bar item** with a people icon — click to see all friends grouped by city, with their current local time and a 🌙 indicator for nighttime (22:00–06:59).
- **Add Friend** form: name, city / IANA timezone search, photo upload.
- **Manage Friends** list: edit or delete existing friends.
- **English / Portuguese** UI — change in Raycast → Extensions → Far Away → Preferences → Language.

## Commands

| Command | Description |
| --- | --- |
| `Friends Menu Bar` | Shows the people icon in the macOS menu bar. |
| `Add Friend` | Open the form to add a new friend. |
| `Manage Friends` | List, edit, and delete friends. |

## Development

```bash
npm install
npm run dev      # starts Raycast in development mode
npm run build    # production build
npm run lint     # lint
```

Friend photos are copied into Raycast's extension support directory; data is persisted in `LocalStorage`.

## Notes

- The `author` field in `package.json` must match your raycast.com publisher handle before running `npm run publish`. For local development this validation does not apply.
