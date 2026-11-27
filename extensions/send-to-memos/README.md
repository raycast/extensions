# Send to Memos

Capture thoughts, tags, and links in [Memos](https://github.com/usememos/memos), the open-source, self-hosted note-taking app. Write a quick memo without leaving Raycast, then save it directly to your own instance.

## Features

- Write plain text or Markdown, including Unicode content and tags.
- Preserve the original memo text, including Markdown indentation and whitespace.
- Add tags and an optional webpage link in a focused capture form.
- Keep new memos private by default, or choose instance-member or public visibility.
- Send a memo and open its permalink in your browser.
- Insert clipboard text or selected text only when you choose the corresponding action.
- Copy the prepared content or the last saved memo's link.
- Check the connection without creating a test memo.

## Set Up Your Memos Instance

This extension connects to an existing Memos instance. It does not host a Memos server or require an AI service.

1. Install **Send to Memos** from the Raycast Store.
2. Enter your **Memos URL**, such as `https://memos.example.com`. Reverse-proxy subpaths such as `https://example.com/notes` are supported.
3. Sign in to Memos and create an access token in **Settings → Access Tokens**. The exact location and wording depend on your Memos version.
4. Paste the token into **Access Token** in Raycast. You can include or omit the `Bearer` prefix.
5. Open the command and select **Actions → Check Connection** to verify that the instance is reachable.

Each user supplies their own instance URL and access token. No instance URL or credential is bundled with the extension.

## Capture a Memo

1. Run **Send to Memos**.
2. Write a memo, add tags, and optionally paste a link. A link can also be saved on its own.
3. Press **⌘ Return** to send, or **⌘ ⇧ Return** to send and open the saved memo.

Tags can be separated by spaces or commas. The extension adds the `#` prefix, removes duplicate tags, and appends them to the Markdown content. Nested tags such as `#reading/books` are supported. Tags already present in the body are not appended again.

After a successful save, the form clears the submitted body and link while retaining edits made during the request. If sending fails, your input stays in the form. Unsubmitted forms use Raycast's draft support.

**Open Memos** opens your configured website. Private memos still require a signed-in browser session to view.

## Preferences

| Preference         | Purpose                                                                             |
| ------------------ | ----------------------------------------------------------------------------------- |
| Memos URL          | Your instance's website address.                                                    |
| Access Token       | The token created in Memos, stored in a Raycast password preference.                |
| Default Tags       | Optional tags for new memos; initially `#raycast`.                                  |
| Default Visibility | Private, instance members, or public; initially private.                            |
| Open After Sending | Open each saved memo in your default browser.                                       |
| API Version        | Automatically detect the API, or explicitly select `/api/v1/memos` or `/api/memos`. |

Your instance's policies may restrict the available visibility levels.

## Compatibility

Supports the `/api/v1/memos` and `/api/memos` REST API families, including the response formats used by [Memos v0.25.3](https://github.com/usememos/memos/blob/v0.25.3/proto/api/v1/memo_service.proto) and [Memos 26.11.0](https://github.com/usememos/memos/blob/26.11.0/proto/api/memo_service.proto).

Automatic detection uses read-only requests with `pageSize=1`. It may read at most one memo per candidate endpoint; the response is used only to identify the API and is not logged or sent elsewhere. Manually selecting an API skips detection when sending. **Check Connection** always performs a read-only check.

Older `/api/memo` deployments and custom gateways are not supported. Other Memos versions should be verified against their actual API configuration.

## Privacy and Reliability

- Memo content and the access token are sent directly to the instance you configure.
- The extension does not use analytics, an AI provider, or an intermediate submission service.
- Clipboard and selected text are read only when you invoke the corresponding action.
- HTTP redirects are not followed, and HTTPS certificate verification stays enabled. Use the final instance URL from your browser.
- Requests time out after 20 seconds. Memo creation is never automatically retried against another endpoint.
- If a request is interrupted or its result cannot be confirmed, check Memos before retrying to avoid duplicate notes.
- Server response bodies and raw network errors are not shown in error messages or written to extension logs.

## Development

```sh
npm ci
npm run dev
```

To verify the extension:

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

Tests cover API detection, UTF-8 Markdown and tags, subpath deployments, invalid tokens, redirects, ambiguous responses, and single-attempt creation. A local HTTP integration test verifies the request format without using a real account.

## Acknowledgments

Built for the open-source [Memos project](https://github.com/usememos/memos). The focused capture workflow was inspired by [Send to flomo](https://github.com/raycast/extensions/tree/main/extensions/send-to-flomo) and the existing [Usememos extension](https://github.com/raycast/extensions/tree/main/extensions/usememos). This is an independently implemented extension with its own code and icon.
