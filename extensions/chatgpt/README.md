<p align="center">
<img width=100 src="https://github.com/abielzulio/chatgpt-raycast/blob/main/assets/icon@dark.png?raw=true">
</p>

<h1 align="center">ChatGPT</h1>

<h3 align="center">
Interact with OpenAI's ChatGPT right from your command bar
</h3>

![Conversation View](metadata/1.png)

# Features

### Ask anything, from your favourite thing

Straight from your command bar, ask anything that you wanted and get ChatGPT's generated answer without opening any browser app.

![Ask ChatGPT from the command bar](metadata/2.png)

### Well-designed, undistracted

Read through AI-generated answer in a clean and nice-looking markdown view without losing ongoing conversation.

![Conversation view](metadata/3.png)

### Save the answer, for later

Got the answer that you wanted? Great. Now you can save it in your collection locally and here you have it! No need to reask again.

![Saving the answer](metadata/4.png)

### Look-up your past, fast

Automatically save all the asked questions and its generated answer locally, so you can go back digging for the answer you're looking for without any internet connection!

![Looking through the question history](metadata/5.png)

# How to use

This package requires a valid session token from ChatGPT to access it's unofficial REST API by [transitive-bullshit/chatgpt-api](https://github.com/transitive-bullshit/chatgpt-api).

To get a session token:

1. Go to https://chat.openai.com/chat and log in or sign up.
2. Open dev tools.
3. Open `Application` > `Cookies`.

   ![ChatGPT cookies](https://github.com/transitive-bullshit/chatgpt-api/blob/main/media/session-token.png?raw=true)

4. Copy the value for `__Secure-next-auth.session-token` and paste in the initialization set-up!

### Update December 11, 2022

Today, OpenAI added additional Cloudflare protections that make it more difficult to access the unofficial API. Here's some additional steps that you need to follow:

2. Copy the value of the `cf_clearance` cookie and store it in a `CLEARANCE_TOKEN` environment variable in addition to your `SESSION_TOKEN`.

![ChatGPT user agent](media/clearance.png)

3. Copy your browser's `user-agent` header from any request in your browser's network tab.

![ChatGPT user agent](media/user-agent.png)

Restrictions on this method:

- Cloudflare `cf_clearance` **tokens expire after 2 hours**, so right now you'll have to manually log in and extract it by hand every so often
- Your `user-agent` and `IP address` **must match** from the real browser window you're logged in with to the one you're using for `ChatGPTAPI`.
  - This means that you currently can't log in with your laptop and then run the bot on a server or proxy somewhere.
- You should not be using this account while the extension is already running, because that browser window may refresh one of your tokens and invalidate the bot's session.

We're working hard in [this issue](https://github.com/transitive-bullshit/chatgpt-api/issues/96) to make this process easier and more automated.

# Initialization set-up

![Initial set-up](metadata/6.png)

> All the preferences value will be stored locally using [Preferences API](https://developers.raycast.com/api-reference/preferences)

---

<p align="right">
Made with ♥ from Indonesia
</p>
