<div align="center">
  <img
    src="https://github.com/raycast/extensions/blob/main/extensions/youtube/assets/youtube.png?raw=true"
    width="50"
  />

  <h1>
    YouTube
  </h1>

Raycast extension to create, search and modify issues, manage merge requests, projects and more.

  <p>
    <a href="https://www.raycast.com/tonka3000/youtube">
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

- Search Videos
- Search Channels

and more

## How to get a YouTube enabled Google API Key

- Goto [Google Developers Console](https://console.developers.google.com) and [obtain authorization credentials](https://developers.google.com/youtube/registering_an_application)  
  Make sure that you logged in with the Google Account which will be associated with your API Key
- Create a project e.g. `raycast`
- Make sure to enable `youtube data api v3` [here](https://console.cloud.google.com/apis/dashboard)  
  Enable the API via the dashboard. Click on the to activate APIs on the top of the website and search for `youtube data api v3`
- Now create credentials and restrict it to `youtube data api v3`  
  You should see a green checkmark next to your credentials
- Set the API token from the previous step into the `API Key` field in this extension preferences

Now you should be able to search videos and channels on YoutTube with Raycast 🚀.
