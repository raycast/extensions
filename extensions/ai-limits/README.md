# AI Limits

See how much of your AI coding limits you've used, when they reset, and what credit is left, in one Raycast list. It covers Claude, Codex, Cursor, Gemini, GitHub Copilot, and API accounts for OpenRouter, z.ai, Kimi Code, DeepSeek and Moonshot.

Run **Show AI Usage**. Each provider shows its headline limit as a colored tag (green below 70% used, yellow below 90%, red from 90%). The detail pane has every window with a progress bar and its reset time, balances, and any notes. Choose **Hide Details** (⌘⇧D) to see the plan and reset time on each row instead.

## Connect

Every provider has a **Connect** action, so you don't need to edit preferences. Choose it and the extension does the rest: it runs the provider's own sign-in, or opens its key page. Connect is the first action on a provider that isn't connected yet, or whose saved login was rejected. **Disconnect** removes what Connect saved.

Connect signs in to the same login your CLI uses. If your login shell sets `CLAUDE_CONFIG_DIR` or `CODEX_HOME`, Connect reads and signs in to that folder rather than the default one. Raycast's own environment rarely has either, so the shell is asked. A local sign-in that's still waiting can be restarted: choose Connect again, then **Start Over**.

## Supported providers

| Provider           | What you need                                                                                                                                                                                                                                                                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Claude**         | Choose **Connect Claude Code**. It reads Claude Code's login from the macOS Keychain after you allow it once. When Claude Code isn't signed in, it opens Terminal to run `claude auth login`. Raycast asks once for permission to control Terminal. If `~/.claude/.credentials.json` exists, it is used too. If your shell sets `CLAUDE_CONFIG_DIR`, that folder is used. |
| **Codex**          | Choose **Connect Codex**. When the Codex CLI isn't signed in, it opens Terminal to run `codex login`, and the extension then reads `auth.json` from `CODEX_HOME` when your shell sets it, or from `~/.codex`. Raycast asks once for permission to control Terminal.                                                                                                       |
| **Cursor**         | Choose **Connect Cursor**. It opens the Cursor app so you can sign in there.                                                                                                                                                                                                                                                                                              |
| **Gemini**         | Choose **Connect Gemini CLI**. It opens Gemini CLI in Terminal so you can sign in with Google. Google retired Gemini CLI sign-in for personal Google accounts in June 2026. It still works with Google Workspace and Gemini Code Assist Standard accounts. On a personal account, signing in again can't help, so the usage shows Google's refusal instead.               |
| **GitHub Copilot** | Choose **Connect GitHub**. It signs in with GitHub OAuth, using the `read:user` scope. Or paste a token (for example from `gh auth token`) into **GitHub Token for Copilot**.                                                                                                                                                                                             |
| **OpenRouter**     | Choose **Connect OpenRouter**. Each Connect creates a new API key on your OpenRouter account, and the extension saves it. Disconnect only removes the key from the extension, so delete old keys at openrouter.ai/settings/keys. Or paste a key with **Enter API Key**.                                                                                                   |
| **z.ai**           | Choose **Connect z.ai**. It opens the key page for a GLM Coding Plan key. The key fills in when you copy it, and you pick the region it was issued in.                                                                                                                                                                                                                    |
| **Kimi Code**      | Choose **Connect Kimi Code**. It opens the key page for a Kimi Code (coding plan) key. The key fills in when you copy it.                                                                                                                                                                                                                                                 |
| **DeepSeek**       | Choose **Connect DeepSeek**. It opens the key page. The key fills in when you copy it.                                                                                                                                                                                                                                                                                    |
| **Moonshot**       | Choose **Connect Moonshot**. It opens the key page. The key fills in when you copy it, and you pick the region it was issued in.                                                                                                                                                                                                                                          |

Providers without credentials appear under **Not Connected**, each with its Connect action. Turn that section off with the **Providers** preference.

## Preferences

- **Show Limits As**: percent used (default) or percent left.
- **Providers**: show or hide providers that aren't connected.
- The provider keys and cookies listed above. Each is optional. A value typed here is used instead of the one Connect saved. While a provider's API key or GitHub token is set here, its Connect action is hidden.

## Fallback: copy a session cookie

Claude and Cursor have a fallback for when Connect can't read their login: **Use Claude Session Key** and **Use Cursor Session Cookie**. They need a browser cookie. This is how to copy one in Chrome or Safari:

1. Sign in to the site (claude.ai or cursor.com) in your browser.
2. Open the developer tools: in Chrome, press Cmd+Option+I, then open the **Application** tab. In Safari, enable the Develop menu in Settings > Advanced, then press Cmd+Option+I.
3. In the left sidebar, open **Cookies** and choose the site.
4. Click the cookie (`sessionKey` for claude.ai, `WorkosCursorSessionToken` for cursor.com) and copy its **Value**.
5. Paste it into the matching action in Raycast, or into the matching preference.

Cookies expire when the site signs you out. When a provider says the credentials were rejected, copy a fresh one.

## Privacy

- Your credentials stay on this Mac. They are only sent to the provider they belong to, over HTTPS.
- Keys and cookies saved by Connect are stored in Raycast's encrypted local storage. **Disconnect** removes them. Values in the preferences are kept by Raycast, and Disconnect doesn't touch them.
- Claude Code stores its login in the macOS Keychain. The extension reads that item only after you choose **Connect Claude Code**. It uses the system `security` tool, so macOS asks you first. It reads the access token, and while a sign-in is waiting it reads only the item's modified date, which doesn't open that prompt. It never refreshes or writes the item.
- Claude's usage comes from the Keychain, from `~/.claude/.credentials.json` when it exists, or from the session cookie.
- The extension never writes to other apps' files. It never refreshes a token in a way that would sign out Claude Code or Codex, since those CLIs rotate their refresh tokens.
- Cursor's local database is opened read-only, with the system `sqlite3` tool.
- The usage numbers are cached on this Mac so the list opens instantly. Nothing is sent anywhere else. There is no analytics.
