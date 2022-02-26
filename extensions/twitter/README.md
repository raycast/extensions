<div align="center">
  <img
    src="https://github.com/raycast/extensions/blob/main/extensions/twitter/assets/twitter.png?raw=true"
    width="50"
  />

  <h1>
    Twitter
  </h1>

Raycast extension to search or send tweets on [twitter.com](https://twitter.com)

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

## Features

- Search Recent Tweets from your timeline
- Search your own Tweets
- Send Tweets
- Reply to Tweets
- Retweet Tweets
- Display Tweet content directly in Raycast
- Search Twitter users

## How to get the access token for the twitter API

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
