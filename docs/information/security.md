# Security

{% hint style="info" %}
Note that this is _not_ a guide on how to create secure Raycast extensions but rather an overview of security-related aspects on how extensions are built, distributed and run.
{% endhint %}

## Raycast

Raycast itself runs outside of the App Store as "Developer ID Application", **signed** with the Raycast certificate and verified by Apple's **notarization service** before the app is distributed. Raycast provides various commands that interact with OS-level functionality, some of which prompt the user for granting **permissions** when required. The app is **automatically kept up-to-date** to minimize the risk of running heavily outdated versions and to ship hotfixes quickly. Raycast is a local-first application that stores user data in a local **encrypted database**, makes use of the system **Keychain** where secure data is stored, and generally connects to third-party APIs directly rather than proxying data through Raycast servers.

## Publishing Process

All extensions are **open source** so the current source code can be inspected at all times. Before an extension gets merged into the **public repository**, members from Raycast and the community collaboratively **review** extensions, and follow our **store guidelines**. After the code review, the Continuous Integration system performs a set of **validations** to make sure that manifest conforms to the defined schema, required assets have the correct format, the author is valid, and no build and type errors are present. (More CI pipeline tooling for automated static security analysis is planned.) The built extension is then **archived and uploaded** to the Raycast Store, and eventually published for a registered user account. When an extension is installed or updated, the extension is downloaded from the store, unarchived to disk, and a record is updated in the local Raycast database. End-users install extensions through the built-in store or the web store.

## Runtime Model

In order to run extensions, Raycast launches a **single child Node.js process** where extensions get loaded and unloaded as needed; inter-process communication with Raycast happens through standard file handles and a thin RPC protocol that only exposes a **defined set of APIs**, that is, an extension cannot just perform any Raycast operation. The **Node runtime is managed** by Raycast and automatically downloaded to the user's machine. We use an official version and **verify the Node binary** to ensure it has not been tampered with.

An extension runs in its own **v8 isolate** (worker thread) and gets its own event loop, JavaScript engine and Node instance, and limited heap memory. That way, we ensure **isolation between extensions** when future Raycast versions may support background executions of multiple extensions running concurrently.

## Permissions

Extensions are **not further sandboxed** as far as policies for file I/O, networking, or other features of the Node runtime are concerned; this might change in the future as we want to carefully balance user/developer experience and security needs. By default and similar to other macOS apps, accessing special directories such as the user Documents directory or performing screen recording first requires users to give **permissions** to Raycast (parent process) via the **macOS Security & Preferences** pane, otherwise programmatic access is not permitted.

## Data Storage

While extensions can access the file system and use their own methods of storing and accessing data, Raycast provides **APIs for securely storing data**: _password_ preferences can be used to ask users for values such as access tokens, and the local storage APIs provide methods for reading and writing data payloads. In both cases, the data is stored in the local encrypted database and can only be accessed by the corresponding extension.

## Automatic Updates

Both Raycast itself and extensions are **automatically updated** and we think of this as a security feature since countless exploits have happened due to outdated and vulnerable software. Our goal is that neither developers nor end-users need to worry about versions, and we **minimize the time from update to distribution** to end-users.
