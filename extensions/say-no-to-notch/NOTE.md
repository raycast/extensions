# NOTE

## Organization

Organization can have a private store. Like `ibluebox`: https://www.raycast.com/ibluebox/say-no-to-notch

The `package.json` has the `owner` field, which is the organization name.

### Publish Extension Publicly

In `package.json`, if there's no `"access": "public"` specified, it will be published as a private extension.

To publish an extension publicly under an organization, you need to add `"access": "public"` to `package.json`.

References:
- https://developers.raycast.com/information/manifest#extension-properties
- https://developers.raycast.com/information/tools/cli#publish
- https://github.com/raycast/extensions/blob/d8ea0f7e7566baee20313ab02e1f963caa6f28fe/extensions/arc/package.json#L9
- https://github.com/raycast/extensions/blob/4bf7785d3c2143a9f489d8d3acf7eeead17bceda/extensions/notion/package.json#L9

> **Warning**
> 
> Noticed that Raycast doesn't allow to publish an extension under an organization, see [error message](https://github.com/raycast/extensions/actions/runs/10521398878/job/29152006480#step:7:340):
> 
> ```
> Error: We are restricting public organisation extensions for the moment. Ping `@pedro` on Slack to discuss it. (say-no-to-notch)
> ```

## Publish Extension

Ensure the `package.json` has the required fields, such as `author`, `license`, `title`, `description`, and `icon`.

Ensure `"@raycast/api"` is the latest version.

Update `CHANGELOG.md` to reflect the changes in the extension. See [Version History](https://developers.raycast.com/basics/prepare-an-extension-for-store#version-history).

Run `npm run build` to validate the extension.

Run `npm run publish` to publish the extension.

Running `npm run publish` will prompt you to log in to your GitHub account and allow the CLI tool to access your GitHub account.

For example, below is the output of running `npm run publish`:

```bash
➜  say-no-to-notch git:(master) npm run publish

> publish
> npx @raycast/api@latest publish

ready -  validate git repository
info  -

🔐 Raycast extensions are published on GitHub.
To automate this process, you have to authenticate with GitHub.

First copy your one-time code: 76CF-DA75
Press Enter to open github.com in your browser...

ready -  getting fork
ready -  cloning repo
ready -  preparing clone
ready -  checking for new contributions
ready -  preparing extension
ready -  pushing extension
ready -  submitting extension


🚀  Your extension has been submitted!

It will be reviewed by the Raycast team shortly.

You can see the submission here:
https://github.com/raycast/extensions/pull/14143

Be sure to add as much details as possible in the PR description to accelerate the review.
```

Under the hood, the `publish` does the following:

- Fork the [Raycast extensions repository](https://github.com/raycast/extensions)
- Clone the forked repository
- Add the extension to the repository, under the `extensions` directory (e.g. `extensions/say-no-to-notch`)
- Push the extension to the repository
- Open a PR to the [Raycast extensions repository](https://github.com/raycast/extensions), e.g. https://github.com/raycast/extensions/pull/14143

The raw PR doesn't have all the necessary information, so you will need to edit the PR to add the missing information, for example:

- Clone the forked repository
  - `git clone git@github.com:honghaoz/raycast-extensions.git`
  - Add screenshots to `extensions/say-no-to-notch/metadata/say-no-to-notch-1`, `extensions/say-no-to-notch/metadata/say-no-to-notch-2` in the forked repository. 
    - See [Adding Screenshots](https://developers.raycast.com/basics/prepare-an-extension-for-store#adding-screenshots).
  - Update README.md and CHANGELOG.md in the forked repository.
- In PR:
  - Add description under the "Description" section.
  - Add screenshots under the "Screencast" section.

The PR will be reviewed by the Raycast team and once approved, the extension will be published.

References:
- [Prepare an Extension for Store](https://developers.raycast.com/basics/prepare-an-extension-for-store)
- [Publishing Extensions](https://developers.raycast.com/basics/publish-an-extension)
- [Extensions Guidelines](https://manual.raycast.com/extensions)
- https://github.com/raycast/extensions/pull/14065
