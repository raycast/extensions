# OpenAI ChatGPT

<img src="assets/chatgpt-icon.png" height="128">

Prompt OpenAI [ChatGPT](https://chat.openai.com/) using Raycast. Extension uses unofficial API. It can stop working anytime and it may be breaking OpenAI ChatGPT Terms of Service. Use at your own risk.

## Authorization

**This extension requires a valid session token from ChatGPT to access it's unofficial REST API.**

To get a session token:

1. Go to https://chat.openai.com/chat and log in or sign up.
2. Open dev tools.
3. Open `Application` > `Cookies`.
   ![ChatGPT cookies](assets/session-token.png)
4. Copy the value for `__Secure-next-auth.session-token` and save it to your environment.

## Credits

- [transitive-bullshit/chatgpt-api](https://github.com/transitive-bullshit/chatgpt-api) for simplifying interaction with ChatGPT API
- [abielzulio/chatgpt-raycast](https://github.com/abielzulio/chatgpt-raycast) for some inspiration
- [OpenAI](https://openai.com) for creating [ChatGPT](https://openai.com/blog/chatgpt/)
