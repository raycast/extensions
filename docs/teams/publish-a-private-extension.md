---
description: Learn how to share an extension in your organization's private extension store
---

# Publish a Private Extension

To publish an extension, run `npm run publish` in the extension directory. The command verifies, builds and publishes the extension to the owner's store. The extension is only available to members of this organization. A link to your extension is copied to your clipboard to share it with your teammates. Happy publishing 🥳

To mark an extension as private, you need to set the `owner` field in your `package.json` to your organization handle. If you don't know your handle, open the Manage Organization command, select your organization in the dropdown on the top right and perform the Copy Organization Handle action (`⌘` `⇧` `.`).

{% hint style="info" %}
Use the Create Extension command to create a private extension for your organization.
{% endhint %}

To be able to publish a private extension to an organization, you need to be logged in. Raycast takes care of logging you in with the CLI as well. In case you aren't logged in or need to switch an account, you can run `npx ray login` and `npx ray logout`.
