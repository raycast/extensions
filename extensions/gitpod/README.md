<p align="center">
  <a href="https://www.gitpod.io">
    <img src="./assets/Icons/GitpodRaycastLogo.svg" alt="Gitpod Logo" height="180" />
    <br />
    <strong>Gitpod Raycast Extension</strong>
  </a>
  <br />
  <span>Powered by The Gitpod Community 💛</span>
</p>

<p align="center">
  <a href="https://gitpod.io/from-referrer/">
    <img src="https://img.shields.io/badge/gitpod-f06611.svg" alt="Gitpod ready-to-code" />
  </a>
  <a href="https://werft.gitpod-dev.com/">
    <img src="https://img.shields.io/badge/typescript-%23007ACC.svg" alt="Werft.dev - Gitpod CI" />
  </a>
  <a href="https://www.gitpod.io/chat"> 
    <img src="https://img.shields.io/badge/-GraphQL-E10098" alt="Discord" />
  </a>
</p>

# Community Raycast Extension for Gitpod 
The Community Raycast Extension is an extension made for the Raycast App in MacOS, which promises to integrate the best features of Gitpod with your operating system by means of Raycast.


The `Community Raycast Extension`, made by Gitpod Heroes [Henit Chobisa](https://github.com/henit-chobisa) and [M Palanikannan](https://github.com/Palanikannan1437) serves the soul aim of making the accessibility of `Gitpod` <i> Blazingly Faster </i> than Local Development by providing extensive features to `Open any GitHub context with Gitpod` or `Managing your Workspaces` just with a click on your menubar, the extension has got you covered 😉


https://github.com/gitpod-samples/Gitpod-Raycast-Extension/assets/72302948/8b49ad96-b4c8-463d-9811-3bb4027682d2
     

## Let's get it on your Mac!

1.  Install Raycast to get started if you haven't by simply clicking on this button!

<a href="https://www.raycast.com/henitchobisa/gitpod"><img src="https://www.raycast.com/henitchobisa/gitpod/install_button@2x.png" height="64" alt="" style="height: 64px;"></a>

2. Navigate to the Raycast Store to Download the `Gitpod` extension
![GithubLogin](/assets/Screenshots/NavigatingContexts/Download%20GItpod.png)
3. Authenticate with GitHub
![GithubLogin](/assets/Screenshots/NavigatingContexts/GIthub%20Login%20Success.png)
4. For directly **Creating**, **Starting**, **Stopping** and **Viewing** the Gitpod workspaces from within the Raycast extension, you'll need a `Gitpod Access Token` which is currently in beta and available for limited users.
![GithubLogin](/assets/Screenshots/NavigatingContexts/AccessTokenGItpod.png)
  - If you have a Gitpod Access token, navigate to Raycast Command settings for the Gitpod extension by using `Cmd + ,` and set the Access token there.
    ![GithubLogin](/assets/Screenshots/NavigatingContexts/GitpodAccessToken.png)
  - If you dont have the Access token, you can still Open **any** GitHub context from the extension in Gitpod (you'll be directed to your browser in this case)

5. Setup your default organization for **Creating** new workspaces in the Manage Workspaces Window.
![GithubLogin](/assets/Screenshots/NavigatingContexts/SetupDefaultOrganization.png)

## Command Descriptions
### <i>Manage Workspaces</i>
`Manage Workspaces` Command is responsible for managing your workspaces from Gitpod Dashboard, you can stop or start your existing workspaces there or create empty workspaces
### <i>Open Contexts from Github</i>
`Open Contexts` command takes the responsibility off your hands to manually browse through GitHub to open workspaces from any context url, no matter if it's a `PR`, `Issue`, `Branch` or the `Repository` itself. Along with that you can PIN contexts for later use/quick access or can view your Issues/PR descriptions right in the extension!
### <i>Menubar Workspaces</i>
`Menubar Workspaces` is the command that gets the extension so near to achieving it's goal of making `Gitpod Faster than local`, with it's function to start workspaces and opening it into your favourite IDE in just a click!

# Table of Contents

1) [Key Features](#key-features)
   - [Navigating Contexts](#navigating-contexts)
      - [Browsing and Filtering](#browsing-and-filtering)
      - [Displaying Contexts](#displaying-contexts)
      - [Pinning Contexts for Faster Access](#pinning-contexts-for-faster-access)
      - [Opening Contexts with Github](#opening-contexts-with-github)
   - [Managing Workspaces](#managing-workspaces)
      - [Starting Workspaces](#starting-workspaces-requires-gitpod-access-token)
      - [Stopping Workspaces](#stopping-workspaces-requires-gitpod-access-token)
      - [Selecting Default Editor to Open](#selecting-default-editor-to-open)
   - [Creating New Workspaces](#creating-new-workspaces)
      - [Creating Workspaces from Context](#creating-workspaces-from-context)
      - [Creating Empty Workspaces](#creating-empty-workspaces)
2) [Feedback](#feedback)
3) [Instructions for Beta Testers](#instructions-for-beta-testers)

# Key Features
## Navigating Contexts
With the `Open Context from Github` Command, it's incredibly easy to navigate contexts such as `Repositories`, `Branches`, `Pull Requests` and `Issues`.

### Browsing and Filtering 
- You can browse Repositories and also any context URL inside of the repository i.e. it's branches, PR or Issues
![Browsing Contexts](/assets/Screenshots/NavigatingContexts/Browse%20Repository.png)
![Browsing Ctx](/assets/Screenshots/NavigatingContexts/Inside%20Repository.png)
- Along with that we make sure that your browsing experience should be super smooth with the help of filtering 
You can filter and search further using the following tags
      - `/b` for branch
      - `/p` for PRs 
      - `/i` for Issues
      - `/me` for anything and everything related to 
         - eg. `/me /p` would refer to your Pull Requests in a particular repository!

### Displaying Contexts
Say you're a product manager or an OSS maintainer, you're tired of opening GitHub again and again browsing through issues/prs to find the right one to solve/review, we got you covered by providing context previews, so that you can have a glimpse on Issues/PRs on the fly.
![Displaying Context](/assets/Screenshots/NavigatingContexts/Search%20PR%20Open.png)
![Displaying Context](/assets/Screenshots/NavigatingContexts/Search%20Issue%20Open.png)

### Pinning Contexts for Faster Access
We pin every context that you open with Gitpod, for faster access and if you wish to manually add any context to your Recents/Pinned list, you can achieve by a single command `cmd` + `R` and bingo!
![Pinning Context](/assets/Screenshots/NavigatingContexts/Add%20To%20Recent%20Issue.png)
![Pinning Context](/assets/Screenshots/NavigatingContexts/Issue%20Recent%20Success.png)
![Pinning Context](/assets/Screenshots/NavigatingContexts/Issue%20Added%20Recent%20.png)

### Opening Contexts with Github
If Context Display is not enough and you need a deep dive in conversation or add any labels, you can open contexts directly in Github with a single command `cmd` + `RETURN`
![Opening Context in Github](/assets/Screenshots/NavigatingContexts/View%20in%20Github%20Issue.png)

## Managing Workspaces
### Starting Workspaces (Requires Gitpod Access Token)
Using the `Managing Workspace` Command, you can *Start* and *launch* your workspaces in your preferrred IDE.
The extension shows you all the stages of your workspaces, Running, Progressing and Stopped.

https://github.com/gitpod-samples/Gitpod-Raycast-Extension/assets/72302948/5cb4887f-b6b2-4a55-941c-ea77706ec8a4

https://github.com/gitpod-samples/Gitpod-Raycast-Extension/assets/72302948/5cafa2ed-9276-4a3a-9325-bbe4962eae96

Wait!! There is more, with `Menubar Workspace` Menubar command, to do this which is the key feature for `Gitpod Accessibility faster than local.`

https://github.com/gitpod-samples/Gitpod-Raycast-Extension/assets/72302948/6ce6ebb7-5f3e-48ce-909d-8e624349eff7

### Stopping Workspaces (Requires Gitpod Access Token)
You can use a simple command `Cmd + s`, on the running workspaces and you can see them stopping in real time, just like magic ✨

https://github.com/gitpod-samples/Gitpod-Raycast-Extension/assets/72302948/c0288710-ec4e-4e4a-add1-31d53f74230a

### Selecting Default Editor to Open
You can also select your favourite editor for opening your workspaces, just go to Command Preferences of the Raycast extension with `cmd + ,` and change the default editor, currently the extension supports `VSCode Browser`, `VSCode Desktop` and `SSH` (in your default ssh client with which you can even use VIM, checkout [axonasif/dotsh](https://github.com/axonasif/dotsh).

![Changing Editor](/assets/Screenshots/Workspaces/Changing%20Editor.png)

## Creating New Workspaces
Currently the extension supports two types of creating workspaces, 
1. Creating Workspaces from Context
2. Creating Empty Workspaces 

### Creating Workspaces from Context 
( Requires Gitpod Access token)
You can browse through contexts in the `Open Context from Github` Command and can create a workspace directly from the there just by using `cmd + g`, g for Gitpod.

https://github.com/gitpod-samples/Gitpod-Raycast-Extension/assets/72302948/51dd9170-2f6c-46f1-bca5-7531eaf8f872


Along with that for creating workspaces, you can also add your configuration such as workspace size, just by using `cmd + e`, where you can select your editor and workspace size for a particular context from which a workspace is to be created.
![Configure Workspace](/assets/Screenshots/Workspaces/ConfigureWorkspace.png)
![Configure Tab](/assets/Screenshots/Workspaces/configureWorkspaceTab.png)

### Creating Empty Workspaces 
For creating empty workspaces on the go, say for some quick experimentation, you can use both the `Open Context Command` or `Menubar` Command


https://github.com/gitpod-samples/Gitpod-Raycast-Extension/assets/72302948/73e39949-a2f2-46a1-8604-d5f3917d1133

https://github.com/gitpod-samples/Gitpod-Raycast-Extension/assets/72302948/a6d30561-bf38-49ad-b0cb-d5819e8c3f4a


## Feedback
At last, we would love 🧡 to hear from you to improve the extension, hence we also put a command called `feedback`, so that you can report any issue in the extension or you can make a feature extension.

# Instructions for Beta Testers
<i>After Joining the Beta Tester Organization</i> by using the link provided to you by the maintainer or a previous beta tester. 
- Navigate to Store
- Change the Store Setting from Public to Gitpod (Beta)
![](/assets/Screenshots/Workspaces/Screenshot%202023-08-08%20at%202.05.42%20PM.png)
- Install the Beta Extension from the Gitpod Extension Store.





