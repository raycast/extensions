<div align="center">
  <img
    src="https://github.com/raycast/extensions/blob/main/extensions/twitter/assets/twitter.png?raw=true"
    width="50"
  />

  <h1>
    Twitter
  </h1>

Raycast extension Send Tweets on [twitter.com](https://twitter.com)

  <p>
    <a href="https://www.raycast.com/tonka3000/twitter">
      <img src="https://img.shields.io/badge/Raycast-store-red.svg"
        alt="Find this extension on the Raycast store"
      />
    </a>
    <a
      href="https://github.com/raycast/extensions/blob/master/LICENSE"
    >
      <img
        src="https://img.shields.io/badge/license-MIT-blue.svg"
        alt="raycast-extensions is released under the MIT license."
      />
    </a>
    <img
      src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg"
      alt="PRs welcome!"
    />
    <a href="https://twitter.com/intent/follow?screen_name=tonka_2000">
      <img
        src="https://img.shields.io/twitter/follow/tonka_2000.svg?label=Follow%20@tonka_2000"
        alt="Follow @tonka_2000"
      />
    </a>
    <a href="https://open.vscode.dev/organization/repository">
      <img
        src="https://open.vscode.dev/badges/open-in-vscode.svg"
        alt="Open in Visual Studio Code"
      />
    </a>
  </p>
</div>

## State of this Extension

Many features of the X API are not available since the rebranding of Twitter to X. This affect some commands of this extension.
For most features, you need a paid account. Check out the X Developers guide for information about the pricing.

I, the original author of this extension (Michael Aigner), do not have such a subscription, and therefore, I cannot really maintain features which require the paid API anymore. Some features maybe will not be restored because they don't exist in the X API yet.
If you have an OAuth key, the commands which requires it should still work in theory.
Maybe somebody with an working OAuth key can fix bugs in the existing command which require a paid subscription.

The affected commands are

- My Recent Tweets
- Recent Tweets

## Web Version

The following commands redirect to the web-site (including the entered content) when no OAuth key is set.
This will keep at least some productivity 😁.

- Send Tweet
- Search User


### How to get the access token for the X API (optional)

This step is optional and is not required for normal usage.

- Goto https://apps.twitter.com
- Register as developer
- Create an app (this will be displayed next to your tweets)
- Store the App-Key and the App-Secret in a secure(!) box
- Then adjust the required permissions

  Per default it is `read-only`. This is fine if you only want to read tweets.

  If you want to e.g. like, retweet or send tweets, you should have at least `read + write`.

  <b style="color:red">Make sure that you change the permission before creating user access tokens. You can only change permission for an existing user access token by revoking/regenerate the tokens. Clients which use the old tokens would not work anymore!</b>

- Create User access tokens

After all these steps you should have all required 4 tokens.

- API Key/App Key
- API Secret/App Secret
- User Access Key
- User Access Token

Store them in a secure box, twitter want display that again for you.

You also need to activate `OAuth 1.0a` for at least `v1` API, otherwise you will get an `403` error. Activate `v2` is recommended, but right now not required.

- Click on your Twitter app on https://apps.twitter.com 
- Navigate to `User authentication settings`
- Press `Set up`
  - Activate `OAuth 1.0a`
  - Choose your App permissions as you like
  - Set `https://raycast.com/redirect` as `Callback URI` 
  - Set `https://raycast.com` as Website URL
  - Press on `Save`

## Showcases

### Tweets from your timelime

![timeline-tweets](https://user-images.githubusercontent.com/3163807/138548798-c0dc86fb-65b8-4ac5-8c14-09511a499a93.png)

### Tweets from a specific user

![search](https://user-images.githubusercontent.com/3163807/138596309-8f524fa7-46ad-485c-a1c8-3f2b7bc147f3.png)

![tweets-from-single-user](https://user-images.githubusercontent.com/3163807/138550958-642eaa3a-bba7-4f06-90d4-ee56986f4edc.png)

### Display tweets directly in raycast

![single-tweet](https://user-images.githubusercontent.com/3163807/138596343-82989b64-eec7-461a-bbe5-e7a4670c0650.png)

![single-tweet-no-img](https://user-images.githubusercontent.com/3163807/138596420-596a3986-0fd1-4ffe-8bd3-11ece0ccc1eb.png)

### Display your own tweets

![own-tweets](https://user-images.githubusercontent.com/3163807/138596461-e843065e-9f10-4ecf-9e9f-4487fe023595.png)
