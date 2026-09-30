# Query ChatGPT

Open ChatGPT in the browser from raycast with your custom prompt and specific query.
The extension leverages AppleScript to open a URL and execute JavaScript within a browser tab, automating the process of
inserting your prompt and query, and then pressing the submit button.
You can create multiple custom commands to open specific GPT versions or to open existing chats, using your
custom prompt and an additional query that you provide on the fly while running the command.

## Motivation

ChatGPT doesn't provide ability to provide custom search query to the URL, like for perplexity or other search
engines `https://www.perplexity.ai/search?q=myquery`.

This extension enables the ability to query ChatGPT asynchronously using your ChatGPT subscription, eliminating the need
to wait for a response.

For example, when writing code, if I identify a utility function that can be entirely delegated to ChatGPT,
I use this extension to dispatch the command and don't wait for the response. I continue writing other parts
of the code, while a freshly opened tab in the background generates a response for me. During this, I may identify other
parts that require consultation with ChatGPT or need code to be written, and with this extension, you can open even more
tabs with ChatGPT. My workflow doesn't rely heavily on immediate responses; in fact, GPT-4 often takes too long to
respond (5+ seconds) for me to wait.

## Installation & Usage

1. Select correct browser in extension settings.
2. Create your first custom command via "Create Custom Command".
3. Enter GPT URL. It can be any GPT or any existing chat link.
4. Provide custom prompt. You can leave that empty as well.
5. On success, you will be redirected to "Create Quicklink" Raycast functionality, enter the name of quicklink.
6. Execute the quicklink to open ChatGPT tab in the browser with your custom query.

