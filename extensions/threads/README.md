# Threads

A basic extension for quickly navigating Threads. Post updates, follow users, view profiles, browse topics, check raw analytics, and draw giveaway winners directly from Raycast.

**Note:** This is not a full Threads client — it provides quick access to common actions and navigation within Threads.

## Threads Access Token

The **Analytics**, **Analytics Menu Bar**, and **Giveaway** commands read from the Threads API
and need a long-lived access token, entered once in the extension preferences. The other
commands work without one.

1. Go to [developers.facebook.com](https://developers.facebook.com) and create an app with the
   **Access the Threads API** use case.
2. Generate an access token with the `threads_basic`, `threads_manage_insights`, and
   `threads_read_replies` permissions. A [step-by-step guide](https://threads-analytics.app/en/token-guide)
   walks through it with screenshots.
3. Paste it into **Threads Access Token** in the extension preferences.

Tokens expire after 60 days. When that happens the commands show a **Threads Access Token
Expired** message with a shortcut to the preferences, and the menu bar shows a warning item —
generate a new token and paste it in. A token missing one of the permissions, and a token the
API is rate-limiting, are reported the same way and name what to do about it.

## Available Commands

### My Feeds

Navigate to different Threads feeds in your browser.

**Options:**

- **For You** - Your personalized feed with recommended content
- **Following** - Posts from accounts you follow
- **Liked** - Posts you've liked
- **Saved** - Posts you've saved for later

### Activity

View your Threads activity and notifications.

**Options:**

- **All** - All activity notifications
- **Follows** - New followers
- **Replies** - Replies to your posts
- **Mentions** - Posts where you're mentioned
- **Quotes** - Posts that quote your content
- **Reposts** - Reposts of your content
- **Verified** - Activity from verified accounts

### Quick Post

Quickly create a new post on Threads.

**Arguments:**

- **Text** (required) - The content of your post
- **Attachment** (optional) - A link to attach to your post

### Search

Search Threads for keywords, hashtags, or topics.

**Arguments:**

- **Query** (required) - Keywords or hashtags to search for
- **Sort** (optional) - Sort results by **Top** (most relevant) or **Recent** (newest first)

### Start a New Thread

Opens a form view to compose a new post with more options.

### Quick Follow

Quickly follow a Threads account.

**Arguments:**

- **Username** (required) - The username to follow (e.g., @username)

### View Profile

View a Threads user profile in your browser.

**Arguments:**

- **Username** (required) - The username to view (e.g., @username)

### Insights

View your account insights and analytics.

**Options:**

- **Last 7 days** - Insights for the past week
- **Last 14 days** - Insights for the past two weeks
- **Last 30 days** - Insights for the past month (default)
- **Last 90 days** - Insights for the past quarter

### Analytics

Shows the raw metrics the Threads API reports, with nothing derived from them.

- **Account** — followers, and views, likes, replies, reposts, and quotes for the selected
  period, plus a day-by-day views table
- **Posts** — your 25 most recent posts, filtered to the selected period, each with its
  views, likes, replies, reposts, quotes, and shares

**Options:**

- **Period** (search bar dropdown) - Last 7, 14, 30 (default), or 90 days

Post metrics are lifetime totals rather than period figures, so changing the period filters
the posts already loaded instead of fetching them again. The list is capped at 25 posts
because the Threads API charges one request per post and the hourly budget is shared with the
other two commands.

### Analytics Menu Bar

Keeps one number in the macOS menu bar. The menu lists your account metrics for the chosen
period and your five most recent posts with their views, likes, and replies. Refreshes every
30 minutes; **Open Analytics** launches the full Analytics command.

**Preferences:**

- **Menu Bar Title** - What sits next to the icon: your follower count (default), or views,
  likes, or replies in the chosen period, or your latest post, or nothing at all. **Latest
  Post** shows the post's first line followed by its views, likes, and replies —
  `Today I learned something… · 1.2K · 56 · 7`. Hover the icon for the full figures. When the
  API doesn't report a metric, the icon appears on its own rather than showing a dash.
- **Period** - Show account metrics for the last 7 (default), 14, 30, or 90 days

### Giveaway

Draws winners from the replies to one of your posts.

1. Pick the giveaway post from your recent posts.
2. Set the entry conditions: one entry per account, must have comment text, required keywords
   (comma-separated, any match), minimum number of tagged accounts, a replied-before cutoff,
   and accounts to exclude. Your own replies are never entered, tagging you doesn't count
   toward the mention requirement, and the same account tagged twice counts once.
3. Add one or more prizes with a quantity each (add or remove prizes from the action menu).
4. **Draw Winners** — an account wins at most once across all prizes. Redraw from the action menu, or copy
   the results as text to post.

The Threads API can only verify replies; repost, follow, and like conditions have to be
checked manually on the winners. The token needs the `threads_read_replies` permission.
Replies from private accounts arrive without a username and cannot be entered, and replies you
hid (or from accounts you blocked or restricted) are left out of the draw — the form reports
how many were excluded for each reason.

### Download Threads Media

Download media from a Threads post — images, videos, and voice posts. Every item in a
carousel is saved, at the highest resolution available.

**Arguments:**

- **Threads URL** (required) - The URL of the Threads post containing media. Accepts a
  canonical post link (`threads.com/@username/post/ABC123`), a link with tracking
  parameters attached, and a `threads.com/share/…` short link.

**Preferences:**

- **Media Download Path** - Custom directory to save downloaded media (optional, defaults
  to your Downloads folder)
- **Image Format** - Threads serves images as WebP. Keep the original, or convert to JPEG or
  PNG for wider app compatibility (macOS only)

Posts that Threads only shows to signed-in users — private accounts, age-restricted posts —
cannot be downloaded, and are reported as such.
