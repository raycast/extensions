---
description: Learn how to get through review process quickly
---

# Prepare an Extension for Store

Here you will find requirements and guidelines that you'll need to follow in order to get through the review before you extension becomes available in the Store. Please read it carefully because it will save time for you and for us. This document is constantly evolving so please do visit it from time to time.

### Metadata and Configuration

* Things to double check in your `package.json`
  * Ensure you use **Raycast** account username in `author` field
  * Ensure you use `MIT` in `license` field
  * Ensure you are using latest Raycast API version
* Please use `npm` for installing dependencies and include `package-lock.json` in your pull request. We use `npm` in our CI when building and publishing extensions, so by providing `package-lock.json` we ensure that dependencies on server are exactly the same as you had locally during testing of your extension.
*   Please check the terms of service of third party services that your extension uses. If your extension doesn't comply with the terms, include a warning in your extension's README. The warning should be similar to:

    > Warning: This extension is not compliant with the Terms of Service of \[service name]. Use at your own risk.

### Extensions and Commands Naming

* Extension and command titles should follow [**Title Case**](https://titlecaseconverter.com/rules/) convention
  * ✅ `Google Workplace` , `Doppler Share Secrets`, `Search in Database`
  * ❌ `Hacker news` , `my issues`
  * 🤔 It's okay to use lower case for names and trademarks that canonically are written with lower case letters. E.g. `iOS` , `macOS` , `npm`.
* **Extension title**
  * It will be used only in the store and in preferences
  * Make it easy for people to understand what it does when they see it in the store
    * ✅ `Emoji Search`, `Airport - Discover Testflight Apps`, `Hacker News`
    * ❌ `Converter`, `Images`, `Code Review`, `Utils`
    * 🤔 In some cases you can add additional information to the title similar to the Airport example above. Only do it if it adds context.
    * 💡 You can use more creative titles to differentiate from other extensions with a similar names.
  * Aim to use nouns rather than verbs
    * `Emoji Search` is better than `Search Emoji`
  * Avoid generic names for an extension when your extension doesn't provide a lot of commands
    * E.g. if your extension can only search pages in Notion, name it `Notion Search` instead of just `Notion`. This will help users to have the right expectations about your extension. If your extension covers a lot of functionality, it's okay to use a generic names like `Notion`. Example: [GitLab](https://www.raycast.com/tonka3000/gitlab).
    * The general rule of thumb – if your extension has only one command, you probably need to name extension close to what this command does. Example: [Visual Studio Code Recent Projects](https://www.raycast.com/thomas/visual-studio-code) instead of just `Visual Studio Code`.
* **Extension description**
  * In one sentence, what does your extension do? This will be shown in the list of extensions in the Store. Keep it short and descriptive. See how other approved extensions in the store do it for inspiration.
* **Command title**
  * Usually it's `<verb> <noun>` structure or just `<noun>`
  * The best approach is to see how other commands are named in Raycast to get inspiration
    * ✅ `Search Recent Projects`, `Translate`, `Open Issues`, `Create Task`
    * ❌ `Recent Projects Search`, `Translation`, `New Task`
  * Avoid articles
    * ✅ `Search Emoji`, `Create Issue`
    * ❌ `Search an Emoji`, `Create an Emoji`
  * Avoid just giving it service name, be more specific about what command does
    * ✅ `Search Packages`
    * ❌ `NPM`
* **Command subtitle**
  * Use subtitles to add context to your command. Usually it's app or service name that you integrate with. It makes command names more lightweight and removes the need to specify service name in the command title.
  * Subtitle is indexed so you can still search using subtitle and title: `xcode recent projects` would return `Search Recent Projects` in the example above.
  * Don't use subtitles as descriptions for your command
    * ❌ `Quickly open Xcode recent projects`
  * Don't use subtitle if it doesn't add context. Usually it happens in single command extensions.
    * There is no need in the subtitle for `Search Emoji` command since it's self-explanatory
    * **Rule of thumb:** If your subtitle is almost a duplication of your command title, you probably don't need it

![Example of good subtitle](../.gitbook/assets/image.png)

### Extension Icon

* Extension published in the Store should have 512x512px icon of `png` format
* The icon should look good in both dark and light themes (you can switch theme in Raycast Preferences → Appearance)
* Extensions that use the default Raycast icon will be rejected
* This [Icon Template](https://www.figma.com/community/file/1030764827259035122/Extensions-Icon-Template) can help you with making and exporting proper icon
* Make sure to remove unused assets and icons
* 💡 If you feel like designing icons is not up to your alley, ask [community](https://raycast.com/community) for help (#extensions channel)

### Provide README if Additional Configuration Required

* If your extension requires additional setup, such as getting API access token, enabling some preferences in other applications or has non-trivial use cases, please provide README file at the root folder of your extension. When README provided users will see "About This Extension" button on preferences onboarding screen.

![](<../.gitbook/assets/CleanShot 2021-11-11 at 17.31.47@2x.png>)

### Contributing to Existing Extensions vs Creating a New One

* **When you should contribute to existing extension instead of creating a new one**
  * You want to make a small improvement to an extension that is already published. E.g. extra actions, new preference, UX improvements, etc. Usually it's a non-significant change.
  * You want to add a simple command that compliments an existing extension without changing extension title or description. E.g. you want to add "Like Current Track" command for Spotify. It wouldn't make sense creating a whole new extension just for this when there is already [Spotify Controls](https://www.raycast.com/thomas/spotify-controls) extension.
  * **Important:** If your change is significant, it would be sensible to contact the author of the extension before you invest a lot of time into it. We cannot merge significant contributions without the author's sign off.
* **When you should consider creating a new extension instead of contributing to existing one**
  * The changes to an existing extension would be significant and might break other people's workflows. Check with the author if you will want to proceed with the collaboration path.
  * Your extension provides integration with same service but has different configuration. E.g. one extension could be "GitHub Cloud", another – "GitHub Enterprise". One extension could be "Spotify Controls" that just uses apple script to play/pause songs, another extension can provide deeper integration via the API and require access token setup. There is no reason to try to merge everything together, this would only make things more complicated.
* **Multiple simple extensions vs one large one**
  * If your extension can act as a standalone and brings something new to the Store, it's acceptable to create a new one instead of adding commands to existing one. E.g. one extension could be "GitHub Repository Search", another one could be "GitHub Issue Search". There is no goal to merge all extensions connecting with one service into one mega extension. However it's also acceptable to merge two extensions under one if authors decide to do so.

### Binary Dependencies and Additional Configuration

* Avoid asking users to perform additional downloads and try to automate as much as possible from the extension, especially if you are targeting non-developers. See [Speedtest](https://github.com/raycast/extensions/pull/302) extension that downloads CLI in the background and later uses it under the hood.
* Don't bundle heavy binary dependencies in the extension – this would lead to increased extension download size.
* If you do end up downloading executable binaries in the background, please make sure it's done from a server that you don't have access to. Otherwise we cannot guarantee that you won't replace the binary with malicious code after the review. E.g. downloading `speedtest-cli` from [`install.speedtest.net`](http://install.speedtest.net) is acceptable, but doing this from some custom AWS server would lead to a rejection.

### Keychain Access

* Extensions requesting Keychain Access will be rejected due to security concerns. If you can't work around this limitation, reach out to us on [Slack](https://raycast.com/community) or via `feedback@raycast.com`.

## UI/UX Guidelines

### Preferences

![Required preferences will be shown when opening the command](<../.gitbook/assets/image (2).png>)

* Use [preferences API](https://developers.raycast.com/api-reference/preferences) to let your user configure your extension or for providing credentials like API tokens
  * When using `required: true`, Raycast will ask a user to set preferences before continuing with an extension. See the example [here](../../extensions/gitlab/package.json#L123).
* You should not build separate commands for configuring your extension. If you miss some API to achieve the prefs setup you want, please file [GitHub issue](https://github.com/raycast/extensions/issues) with a feature request.

### Action Panel

![](<../.gitbook/assets/CleanShot 2021-10-19 at 23.15.41@2x.png>)

* Actions in the action panel should also follow **Title Case** naming convention
  * ✅ `Open in Browser`, `Copy to Clipboard`
  * ❌ `Copy url`, `set project`, `Set priority`
* Provide icons for actions if there are other actions with icons in the list
  * Avoid having list of actions where some have icons and some don't
* Add ellipses `...` for actions that will have submenu. Don't repeat parent action name in submenu
  * ✅ `Set Priority...` and submenu would just have `Low`, `Medium`, `High`
  * ❌ `Set Priority` and submenu would have `Set Priority Low`, `Set Priority Medium`, etc

### Navigation

* Use [Navigation API](https://developers.raycast.com/api-reference/user-interface/navigation) for pushing new screens. This will ensure that a user can navigate in your extension the same way as in the rest of the application.
* Avoid introducing your own navigation stack. Extensions that just replace the view's content when it's expected to push a new screen will be rejected.

### Empty States

* When you update lists with empty array of elements, "No results" view will be shown. Avoid introducing your own UI to achieve similar effect (e.g. showing list item).
  * **Known issue:** Sometimes there is nothing you can show when search query is empty and an extension shows "No results" when you open it (often in search commands). We have plans to provide API that would improve that experience. In the meantime you might want to consider introducing some sections that could be helpful in an empty state – e.g. suggestions or recently visited items.
* **Common mistake** – "flickering empty state view" on start
  * If you try render empty list before real data arrives (e.g. from the network or disk), you might see flickering "No results" view when opening extension. To prevent this make sure to not return empty list of items before you get the data you want to display. In the meantime you can show loading indicator. See [this example](https://developers.raycast.com/information/best-practices#show-loading-indicator).

### Navigation Title

* Don't change `navigationTitle` in the root command, it will be automatically set to the command name. Use `navigationTitle` only in nested screens to provide additional context. See [Slack Status extension](https://github.com/raycast/extensions/blob/020f2232aa5579b5c63b4b3c08d23ad719bce1f8/extensions/slack-status/src/setStatusForm.tsx#L95) as an example of correct usage of `navigationTitle` property.
* Avoid long titles. If you can't predict how long is gonna be string you're using for the navigation title, consider using something else. E.g. in Jira extension we used issue key instead of the issue title to keep it short.
* Avoid updating navigation title multiple times on one screen depending on some state. If you find yourself doing it, there is high chance you are misusing it.

### Placeholders in Text Fields

* For better visual experience please add placeholders in text field and text area components. This includes preferences.
* Don't leave the search bar without a placeholder

### Localization / Language

* At the moment Raycast doesn't support localization and only supports US English. Therefore, please avoid introducing your custom way to localize your extension. If locale might affect functionality (e.g. using the correct unit of measurement), please use preferences API.
* Use US English spelling (not British)
