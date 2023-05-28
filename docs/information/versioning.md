# Versioning

Versioning your extensions is straightforward since we've designed the system in a way that **frees you from having to deal with versioning schemes and compatibility**. The model is similar to that of app stores where there's only one implicit _latest_ version that will be updated when the extension is published in the store. Extensions are automatically updated for end users.

## Development

For **development**, this means that you do _not_ declare a version property in the manifest. If you wish to use API features that were added in a later version, you just update your `@raycast/api` npm dependency, start using the feature, and submit an extension update to the store.

## End Users

For **end-users** installing or updating your extension, Raycast automatically checks the compatibility between the API version that the extension actually uses and the user's current Raycast app version (which contains the API runtime and also manages the Node version). If there's a compatibility mismatch such as the user not having the required latest Raycast app version, we show a hint and prompt the user to update Raycast so that the next compatibility check succeeds.

## Version History

Optionally, you can provide a `changelog.md` file in your extension, and give detailed changes with every update. These changes can be viewed by the user on the extension details screen, under Version History, as well as on the [raycast.com/store](https://raycast.com/store).

You can learn more about Version History [here](../basics/prepare-an-extension-for-store.md#version-history), how to add it to your extension, and the required format for the best appearance.

## API Evolution

Generally, we follow an **API evolution** process, meaning that we stay backward-compatible and do not introduce breaking changes within the same major API version. We'll 1) add new functionality and 2) we'll mark certain API methods and components as _deprecated_ over time, which signals to you that you should stop using those features and migrate to the new recommended alternatives. At some point in the future, we may introduce a new breaking major release; however, at this time, you will be notified, and there will be a transition period for migrating extensions.
