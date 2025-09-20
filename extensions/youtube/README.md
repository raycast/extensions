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
- Popular Videos

and more

## How to get a YouTube enabled Google API Key

⚠️ The following description can change over time. Make sure to obtain an `API key` and not an `OAuth key`!
You can search on YouTube to get a video about the process like [this video](https://www.youtube.com/watch?v=LLAZUTbc97I).

- Goto [Google Developers Console](https://console.developers.google.com)

  Make sure that you logged in with the Google Account which will be associated with your new API Key

- Create a project and named it e.g. `Raycast`

  This step take some seconds until the project is created.

- Enable the `Youtube Data API v3`

  1. Click [here](https://console.cloud.google.com/apis/library/youtube.googleapis.com)
  2. Press the `Enable` button

- Create credentials

  1. Click [here](https://console.cloud.google.com/apis/credentials)
  2. Click on `Create Credentials` in the upper menu bar
  3. Click on `API key`
  4. When you get asked which `Credential Type` you wanna use click on `Public data`.
  5. You should now see your API key
  6. Copy the `API key` to the clipboard

- Use the API key from the previous step in the `API Key` field of this extension

Now you should be able to search videos and channels on YoutTube with Raycast 🚀.
