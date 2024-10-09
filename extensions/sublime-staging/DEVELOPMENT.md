# Sublime Raycast extension

## Development setup

-   Install [Raycast](https://raycast.app)
-   Create a folder `sublime-raycast` and clone [Startupyworld/sublime-raycast](https://github.com/Startupyworld/sublime-raycast) to a `sublime` folder within it.
-   Fork [raycast/extensions](https://github.com/raycast/extensions) with your personal GitHub account and clone your fork to the `raycast-extensions` folder next to `sublime`.
-   Run `npm install` in the `sublime` folder
-   Run `npx ray login` and log in with an account that's part of the `Sublime` Raycast Team.
-   Run `npx develop` in the `sublime` folder to install your local extension in Raycast

See [developers.raycast.com](https://developers.raycast.com) for more.

Note that not all Raycast commands are enabled in development & staging, because there's a limit to the number of free Team commands. See `scripts/patch-prod.js`.

## Publish

-   `npm run publish-staging` to publish in our private extension store
-   `npm run publish-prod` to publish the prod extension for review
