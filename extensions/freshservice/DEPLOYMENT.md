# Deployment Guide - Freshservice Raycast Extension

There are three ways to "deploy" your extension depending on who you want to use it.

## 1. Local Usage (Personal)
If you just want to use the extension yourself, you've already done most of the work!

-   **Install**: While `npm run dev` is running, the extension is already installed in your local Raycast.
-   **Persistent Install**: To use it without having the terminal open, run:
    ```bash
    npm run build
    ```
    After building, Raycast will keep the extension installed locally. You can find it in **Raycast Settings > Extensions**.

## 2. Share with Team (Personal Link)
If you want to share this with colleagues without putting it on the public Store:

1.  **Login to Raycast**:
    ```bash
    npx @raycast/api@latest login
    ```
2.  **Publish to Personal Repository**:
    ```bash
    npm run publish
    ```
3.  **Share Link**: Raycast will provide a private link that your colleagues can click to install the extension directly.

## 3. Publish to Raycast Store (Public)
To make this available to all Freshservice users:

1.  **Check Requirements**: Ensure your `package.json` has a clear `description`, `author`, and `categories`.
2.  **Submit**: Follow the [Raycast Publishing Guide](https://developers.raycast.com/publish-your-extension). This usually involves submitting a Pull Request to the [Raycast Extensions Repo](https://github.com/raycast/extensions).

## Important: API Security
-   **Never** commit your Freshservice API Key to the repository.
-   The current implementation uses **Raycast Preferences**, which are stored securely on the user's machine. Users will be prompted for their credentials the first time they run the extension.
