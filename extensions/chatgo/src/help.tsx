import { Action, ActionPanel, Detail } from "@raycast/api";
import { HOST } from "./service";

const md = `# ChatGo

<p align="center">
   <img src="command-icon.png" height="128">
   <h1 align="center">ChatGo</h1>
 </p>

## Overview

A [Raycast](https://raycast.com/) extension that lets you interact with [ChatGo](http://www.chatgo.pro/).

To use this extension, you must have an ChatGo account, sign up at [ChatGo](http://www.chatgo.pro/), then add the email and password during the extension configuration screen.

## Actions

\`Ask Question\`: You can use the preset templates to ask questions.

\`Conversations\`: Can view all your session records stored locally.

\`History\`: Can view all your session history stored locally.

\`Draw\`: Return images with your prompt words.

\`Template Store\`: Add and manage all preset templates here.

\`Help\`: This is the help center.

## Discussion Group
You can scan the QR code below and note Raycast ChatGo to join the relevant discussion group and receive free Token
<p>
  <img src="wechat.jpg" width="256" style="display: inline;">
</p>


## Issues
Any comments or suggestions are welcome to raise issue

## License
The code in this project is released under the MIT License.
`;
export default function Help() {
  return (
    <Detail
      navigationTitle="Help Center"
      markdown={md}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title={"Go to the Official Website to See More"} url={HOST} />
        </ActionPanel>
      }
    />
  );
}
