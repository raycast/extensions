# Publishing to Raycast Store

This is a maintainer-only workflow. It publishes the public source in this
repository for review by Raycast; it does not release the DevKin macOS app.

1. Ensure the extension changes are committed and the working tree is clean.
2. Install the locked dependencies and validate the distribution build:

   ```sh
   npm ci
   npm run lint
   npm run build
   ```

3. Submit the extension:

   ```sh
   npm run publish
   ```

The Raycast CLI authenticates with GitHub and creates or updates a pull request
to the public `raycast/extensions` repository. Raycast reviews the pull request
and publishes the extension to the Store after it is merged.
