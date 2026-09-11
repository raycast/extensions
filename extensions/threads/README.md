# Threads

A basic extension for quickly navigating Threads. Post updates, follow users, view profiles, and browse topics directly from Raycast.

**Note:** This is not a full Threads client — it provides quick access to common actions and navigation within Threads.

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
