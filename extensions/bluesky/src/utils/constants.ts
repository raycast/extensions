export const ATPSessionStorageKey = "ATPSession";
export const ATPCredentialsHashKey = "ATPCredentialsHashKey";
export const ShowPeopleViewAsGridCacheKey = "show-people-view-as-grid";
export const ShowPostDetailsCacheKey = "show-post-details";
export const ProfileCacheKey = "profile";
export const DefaultPostCacheKey = "draft-post";
export const TimelineCacheKey = "timeline";
export const NotificationCacheKey = "notification";

export const BlueskyUrl = "https://staging.bsky.app";
export const BlueskyProfileUrlBase = `${BlueskyUrl}/profile`;
export const MenuBarIconUrl = `command-icon.png`;

export const MenuBarTooltip = "Bluesky Quick Actions";

export const BlueskyFeedType = "app.bsky.feed.post";
export const BlueskyQuoteType = "app.bsky.embed.record";
export const BlueskyImageEmbedType = "app.bsky.embed.images#view";
export const BlueskyPostEmbedType = "app.bsky.embed.record#view";

export const ViewTimelineNavigationTitle = "Timeline";
export const ViewTimelineSearchBarPlaceholder = "Search timeline...";

export const ViewRecentPostsNavigationTitle = "Your Recent Posts";
export const ViewRecentPostsSearchBarPlaceholder = "Search posts in";

export const ViewNotificationsNavigationTitle = "Notifications";
export const ViewNotificationsSearchBarPlaceholder = "Search notifications...";
export const MarkNotificationsAsRead = "Mark All Notifications As Read";
export const NotificationsReadToast = "All Notifications have been marked as read.";
export const ViewInBrowser = "View In Browser";
export const LoadingNotificationContent = "Loading Notification Content.";
export const ViewingNotification = "Viewing Notification Content.";
export const ErrorLoadingNotification = "Error: Could not load notification content.";

export const SessionStartFailed = "Error: Failed to Start Your Session";

export const MarkNotificationsAsReadAlert = "Mark all notification as read?";
export const NewNotification = "New Notification";
export const NewNotifications = "New Notifications";
export const NoNewNotifications = "No new notifications";
export const ViewNotification = "View Notifications";

export const CreatePostFormPlaceholder = "Create Post";
export const PublishPostConfirmation = "Publish this post?";
export const PostSuccessToastMessage = "Your Post has been Published.";
export const CreatePostTitle = "⌘ + Enter to Publish";

export const SearchPeopleTitle = "People";
export const SearchPeopleSearchBarPlaceholder = "Search People and entities...";
export const OpenUserProfile = "Open User Profile";
export const Follow = "Follow";
export const FollowToastMessage = "You are now following";
export const Unfollow = "Unfollow";
export const UnfollowToastMessage = "You are no longer following";
export const Mute = "Mute";
export const MuteToastMessage = "You have muted";
export const Unmute = "Unmute";
export const UnmuteToastMessage = "You have unmuted";
export const ViewAsList = "View As List";
export const ViewAsGrid = "View As Grid";
export const SearchPeopleViewOpenedToast = "Search for people and other entities in Bluesky.";

export const SwitchToHomeAction = "Switch to home view";

export const LikePost = "Like";
export const UnlikePost = "Unlike";
export const Repost = "Repost";
export const ReplyPost = "Reply to Post";
export const QuotePost = "Quote Post";
export const OpenPostInBrowser = "Open Post In browser";
export const OpenProfileInBrowser = "Open Profile In browser";
export const HidePostDetails = "Hide Post Details";
export const ShowPostDetails = "Show Post Details";
export const LikePostToastMessage = "You have liked this post.";
export const UnlikePostToastMessage = "You have unliked this post.";
export const RepostToastMessage = "You have reposted this post.";
export const ErrorToastMessage = "Action failed. Please try again later.";

export const NavigationViewTooltip = "Select A View";

export const AboutNavigationTitle = "About";
export const HomeNavigationTitle = "Home";

export const SelectActionMessage = "Select";
export const ShareYourNext = "Share your next";
export const PostYourReply = "Replying to";
export const Quoting = "Quoting";

export const SignedOut = "Signed Out";

export const FirstSignInSuccessToast = "You have successfully signed in to Bluesky 🎉";

export const PostEndHorizontalLine = `

---
`;

export const AboutMarkdown = `
### Bluesky for Raycast (beta) 🦋
_by Dharam Kapila_ 

![](bluesky-onboarding.gif)

#### 🪄 Tips 
- Create a keyboard shortcut for the **Home** command from Raycast settings.
- Press \`⌘ + K\` to take actions on a selected item.

#### 🚀 Features I'd like to build next
- Search and filtering improvements for posts.
- AI summarizations of your timeline/threads.
- Visualizing your timeline and threads in new ways.
- Further improvements to user experience, speed and reliability.

 #### 👋 Support
- Reach out to me on Bluesky [@dharam.bsky.social](${BlueskyProfileUrlBase}/dharam.bsky.social) for any suggestions or problems. Or to say hi :)
- To support my work, please consider buying me a coffee: [https://buymeacoffee.com/dharam](https://buymeacoffee.com/dharam) 💕

#### 🔒 Privacy
- No user data is collected. No analytics are collected.
- Your credentials are stored securely in Raycast's encrypted database.
- Recent posts/notifications are cached. Signing out or uninstalling the extension will clear the cache.
---

Thank you for using this extension. And to the special work being done by [Bluesky](https://blueskyweb.xyz/) and [Raycast](https://www.raycast.com) (*´∀人)
`;

export const SigningOutToast = "Signing you out of your Bluesky account.";
export const SignedOutToast = "Signed Out";

export const SignedOutMarkdown = `
## You have signed out of your Bluesky session 🚪

Press \`Enter\`, and **remove** your login details from the extension settings.
`;
export const SigningOutMarkdown = `
## Signing you out of your Bluesky account.
`;
export const SignOutActionMessage = "Update Your Account Details";

export const ErrorMessageBody = `
Please try updating your account details in the extension preferences. 
If the issue persists, create an issue on Github, or reach out to me on Bluesky [@dharam.bsky.social](${BlueskyProfileUrlBase}/dharam.bsky.social).
`;

export const OnboardingTitleMd = `
## Welcome to Bluesky for Raycast (beta)

Here are a 3 tips to get you started.

Press enter to continue...
`;
export const OnboardingImageMd = `

![](bluesky-onboarding.gif)
`;

export const OnboardingTips = [
  "Press `⌘ + H` from anywhere to go back Home.",
  "Press `⌘ + K` or right click on a selected post to like, reply or repost.",
  "Press `⌘ + P` to switch to another view (from timeline to notifications).",
  "**Bonus Tip:** Select the last post to load more posts.",
  "Start using Bluesky for Raycast 🦋",
];
