# Hacker News Top Stories

A menubar extension to view and track top stories from Hacker News

Ask Raycast AI what's new with `@hacker-news-top-stories`. It summarizes your unread stories a few at a time (set by **Stories per Summary**), each with its top two comments and links to the article and the discussion, and says how many more are unread. It reads articles from the open browser tab when the Raycast browser extension is installed. Stories Raycast AI summarizes or reads are marked read; turn off the **Raycast AI** preference to stop that.

Read stories sync between your Macs through a "Raycast Hacker News" folder in iCloud Drive. Turn off the **iCloud Sync** preference to keep them on each Mac.

This extension supports optionally showing native notifications for new stories. For a better experience (story icons, "click to open"), install terminal-notifier. Otherwise, notifications will use a generic notification system via apple script.

```shell
brew install terminal-notifier
```

Note: You may need to restart your Mac for changes to take effect. Alternatively, you can run `killall NotificationCenter` to refresh the notification center.
