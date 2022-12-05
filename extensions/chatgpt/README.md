# Raycast ChatGPT

Prompt ChatGPT using Raycast. Extension uses unofficial API. It can stop working anytime and it may be breaking OpenAI ChatGPT Terms of Service. Use at your own risk.

## How can I obtain the JWT token?

1. Open https://chat.openai.com/chat and log in
2. Open browser DevTools (F12)
3. Open Network tab
4. Send any message to ChatGPT
5. Find the `conversation` request
6. Under Request Headers find `authorization` header
7. Copy the part after `Bearer`. That is your JWT token
8. Paste it in the extension preferences
