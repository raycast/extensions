# <img src="./assets/logsnag.png" width="20" height="20" /> LogSnag Raycast Extension

This is a Raycast extension for [LogSnag](https://logsnag.com/). With this extension, you can Publish Events and Insights to LogSnag.

## 🚀 Getting Started

1. **Install extensions**: Click the `Install Extension` button in the top right of [this page](https://www.raycast.com/xmok/logsnag)

2. **Get your API Key**: The first time you use the extension, you'll need to enter your LogSnag API key:

    a. `Sign in to your LogSnag Dashboard` at [this link](https://app.logsnag.com/auth/sign-in) OR `Create an account` at [this link](https://app.logsnag.com/auth/sign-up)

    b. `Navigate` to [API](https://app.logsnag.com/dashboard/settings/api)

    c. `Create Token` then `Copy`

    d. Enter `API Key` in Preferences OR at first prompt

## 🗒️ NOTES (as of 18Jul23)

- Currently, LogSnag API does not allow you to fetch any Logs or Insights (i.e. you can only POST). As a workaround, when you publish a new log or insight using the extension, it is logged locally for your convenience. You can choose to keep or delete logged items from log (they can still be viewed in your LogSnag Dashboard).

- Currently, LogSnag does not inform you if your API token is invalid (this is an intentional design choice). Thus, if your API Token is invalid, the extension will not show you an error. To ensure your API Token is working, publish a log or event then check your LogSnag Dashboard to make sure it is published successfully.

- For a Log to be published, create the following in LogSnag Dashboard BEFORE you use the extension:
    - Project
    - Channel
- For an Insight to be published, create the following in LogSnag Dashboard BEFORE you use the extension:
    - Project


## 🔧 Commands

This extension provides the following commands:

- Events
    - View Events
    - Publish Event
- Insights
    - View Insights
    - Publish Insight