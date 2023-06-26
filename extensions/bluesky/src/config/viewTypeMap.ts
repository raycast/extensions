import { Icon } from "@raycast/api";
import { PrivacyNavigationTitle } from "../utils/constants";
import { ViewType } from "../types/types";
import { getFormattedActionShortcut } from "../utils/common";

export const ViewTypes: ViewType[] = [
  {
    id: "0",
    getName: () => "Home",
    navbarSectionId: "0",
    icon: Icon.BulletPoints,
    description: "Home View",
    hideInHomeView: true,
    hideInNavView: true,
  },
  {
    id: "1",
    getName: () => "Timeline",
    navbarSectionId: "2",
    icon: Icon.BulletPoints,
    description: `
View your timeline feed. 

- Press \`⌘ + Enter\` to enter selected an account profile.
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
    navbarSectionId: "2",
    icon: Icon.AlarmRinging,
    description: `
View your recent notifications. 

- Press \`⌘ + Enter\` to mark all notifications as read.
`,
  },
  {
    id: "3",
    getName: () => "Search",
    navbarSectionId: "2",
    icon: Icon.MagnifyingGlass,
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
    navbarSectionId: "1",
    icon: Icon.Bubble,
    description: `
Create a New Post.

- Press \`⌘ + Enter\` to publish your post.
`,
  },
  {
    id: "5",
    getName: () => "My Recent Posts",
    navbarSectionId: "1",
    icon: Icon.Person,
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
    getName: () => "My Recent Likes",
    navbarSectionId: "1",
    icon: Icon.Heart,
    description: `
View your recently liked posts.

- Press \`⌘ + Enter\` to open the thread in your browser.
- Press ${getFormattedActionShortcut("like")} to like a post.
- Press ${getFormattedActionShortcut("unlike")} to unlike a post.
- Press ${getFormattedActionShortcut("repost")} to repost.
- Press ${getFormattedActionShortcut("reply")} to reply to a post.
- Press ${getFormattedActionShortcut("quote")} to quote a post.
     `,
  },
  {
    id: "7",
    getName: () => PrivacyNavigationTitle,
    navbarSectionId: "3",
    icon: Icon.Lock,
    description: "View and manage accounts you have muted or blocked.",
  },
  {
    id: "8",
    getName: () => "About",
    navbarSectionId: "3",
    icon: Icon.Cd,
    description: "About Bluesky for Raycast (beta).",
  },
];
