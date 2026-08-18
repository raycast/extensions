<p align="center">
    <img src="./assets/linear-app-icon.png" width="150" height="150" />
</p>

# Linear

_Create, search and modify your issues from anywhere on your **Mac** or **Windows** device._

The Linear extension brings the speed, quality and joy of the app to every corner of your **Mac** or **Windows** device.

## ❓ FAQs

**Q1. How do I log in?**

**Ans.** The extension securely uses OAuth to authenticate with Linear.

**Q2. How do I switch workspaces?**

**Ans.** Connect additional workspaces with the **Manage Workspaces** command, then switch using the workspace dropdown on any list command, the Workspace field on forms, the optional `workspace` argument on **Quick Add Comment to Issue**, or the dedicated **Create Issue for Myself in Workspace** command.

## Multiple Workspaces

The extension supports any number of Linear workspaces — including the same workspace
connected under two different accounts.

- **Add a workspace:** open **Manage Workspaces** → **Add Workspace** (⌘N). Linear has no
  workspace picker on its consent page: first switch to the target workspace at
  [linear.app](https://linear.app) (top-left workspace switcher), then approve the grant.
- **Switch:** every list command has a Workspace dropdown (visible once you have two or
  more workspaces); forms have a Workspace field; **Quick Add Comment to Issue** accepts an
  optional `workspace` argument (URL key, account email, or unique name prefix) that acts
  once without changing your default, and a dedicated **Create Issue for Myself in
  Workspace** command targets any workspace by URL key, account email, or unique name
  prefix without changing your default.
- **Menu bar:** unread notifications aggregate across all connected workspaces, one
  section each.
- **Log out:** use Manage Workspaces (its rows show the workspace and account, unlike
  Raycast's built-in login list). Logging out removes the login from Raycast; the grant
  at Linear expires on its own within 24 hours.
- **Preferences** (like a preferred team key) apply per command and are matched inside
  whichever workspace the command acts in.
