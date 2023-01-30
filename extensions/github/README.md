# GitHub

Work with issues, pull requests, manage workflows, search repositories and stay on top of notifications.

## Deeplinking

It's possible to pre-fill the `Set Status` command's form thanks to deep links.

Indeed, this command supports additional parameters through the `context`:

- `emoji`: the status's emoji
- `message`: the status's message
- `limitedAvailability`: `"true"` if you have a `Busy` status on GitHub, `"false"` otherwise.

Let's take an example: `raycast://extensions/raycast/github/set-status?context=%7B%22emoji%22%3A%technologist%22%2C%22message%22%3A%22Coding%22%2C%22limitedAvailability%22%3A%22true%22%7D`

This URL has three parameters in the `context`:
- `emoji`: 🧑‍💻
- `message`: `Coding`
- `limitedAvailability`: `"true"`

When opening such a link, it'll pre-fill the `Set Status` form with the parameters set above.
