import { SectionType, ViewType } from "../types/types";
import { getFormattedActionShortcut, getProfileTitle } from "../utils/common";

import { Icon } from "@raycast/api";

export const SectionTypes: SectionType[] = [
  {
    id: "0",
    getName: () => "Home",
  },
  {
    id: "1",
    getName: () => "User",
  },
  {
    id: "2",
    getName: () => "World",
  },
  {
    id: "3",
    getName: () => "Settings",
  },
];

export const ViewTypes: ViewType[] = [
  {
    id: "0",
    getName: () => "Home",
    sectionId: "0",
    icon: Icon.BulletPoints,
    description: "Home View",
    hideInHomeView: true,
  },
  {
    id: "1",
    getName: () => "Timeline",
    sectionId: "2",
    icon: Icon.BulletPoints,
    description: `
View your timeline feed. 

- Press \`⌘ + Enter\` to enter selected user profile.
- Press ${getFormattedActionShortcut("like")} to like a post.
- Press ${getFormattedActionShortcut("unlike")} to unlike a post.
- Press ${getFormattedActionShortcut("repost")} to repost.
- Press ${getFormattedActionShortcut("reply")} to reply to a post.
- Press ${getFormattedActionShortcut("quote")} to quote a post.
`,
  },
  {
    id: "2",
    getName: () => "Notifications",
    sectionId: "2",
    icon: Icon.AlarmRinging,
    description: `
View your recent notifications. 

- Press \`⌘ + Enter\` to mark all notifications as read.
`,
  },
  {
    id: "3",
    getName: () => "People",
    sectionId: "2",
    icon: Icon.TwoPeople,
    description: `
Search for People and Entities on Bluesky. 

- Press ${getFormattedActionShortcut("viewAsList")} to toggle between list and grid views.
- Press ${getFormattedActionShortcut("follow")} to follow someone.
- Press ${getFormattedActionShortcut("unfollow")} to unfollow someone.
- Press ${getFormattedActionShortcut("mute")} to mute someone.
- Press ${getFormattedActionShortcut("unmute")} to unmute someone.
`,
  },
  {
    id: "4",
    getName: () => "New Post",
    sectionId: "1",
    icon: Icon.Bubble,
    description: `
Create a New Post.

- Press \`⌘ + Enter\` to publish your post.
`,
  },
  {
    id: "5",
    getName: () => {
      const profileTitle = getProfileTitle();
      return profileTitle ? profileTitle : "Your Recent Posts";
    },
    sectionId: "1",
    icon: Icon.AtSymbol,
    description: `
View your recent posts.

- Press \`⌘ + Enter\` to open the thread in your browser.
- Press ${getFormattedActionShortcut("like")} to like a post.
- Press ${getFormattedActionShortcut("unlike")} to unlike a post.
- Press ${getFormattedActionShortcut("repost")} to repost.
- Press ${getFormattedActionShortcut("reply")} to reply to a post.
- Press ${getFormattedActionShortcut("quote")} to quote a post.
     `,
  },
  {
    id: "6",
    getName: () => "Sign Out",
    sectionId: "3",
    icon: Icon.Logout,
    description: "Sign out of your active session.",
  },
  {
    id: "7",
    getName: () => "About",
    sectionId: "3",
    icon: Icon.Cd,
    description: "About Bluesky for Raycast.",
  },
];
