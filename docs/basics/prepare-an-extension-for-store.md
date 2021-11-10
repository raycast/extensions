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
* Please check the terms of service of third party services that your extension uses. If your extension doesn't comply with the terms, include a warning in your extension's README. The warning should be similar to:
  > Warning: This extension is not compliant with the Terms of Service of [service name]. Use at your own risk.

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

### Localization / Language

* At the moment Raycast doesn't support localization and only supports US English. Therefore, please avoid introducing your custom way to localize your extension. If locale might affect functionality (e.g. using the correct unit of measurement), please use preferences API.
* Use US English spelling (not British)
