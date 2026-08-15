# WordPress Manager for Raycast

Manage your WordPress site directly from Raycast. Create posts, moderate comments, manage plugins, and more without opening a browser.

## Manual Installation (Beta)

Until the extension is officially available in the Raycast Store, you can install and run it locally:

1.  **Download or Clone** this repository.
2.  **Install Dependencies**:
    ```bash
    npm install
    ```
3.  **Build and Import**:
    Run the following command to compile the extension and import it into Raycast:
    ```bash
    npm run dev
    ```
    Alternatively, you can run `npm run build` to create a production build.
4.  **Open Raycast**: You should now see the "WordPress Manager" commands available in your Raycast search.

## Features

### Content Management
- **Manage Posts**: Create, edit, publish, and delete posts with full category/tag support
- **Manage Pages**: Hierarchical page management with parent/child relationships
- **Quick Post**: Rapidly create new posts with minimal friction
- **Search Content**: Universal search across all your WordPress content

### Moderation
- **Moderate Comments**: Approve, spam, or trash comments with one click
- **Batch Actions**: Quickly process pending comments

### Site Administration
- **Media Library**: Browse, copy URLs, and manage media files
- **Manage Users**: View user profiles and roles
- **Manage Plugins**: Activate and deactivate plugins
- **Site Dashboard**: Quick overview and links to WordPress admin

## Setup

### Requirements

- WordPress 5.6 or later
- Application Passwords feature enabled (enabled by default in WordPress 5.6+)
- Administrator or Editor role on your WordPress site

### Generate an Application Password

1. Log in to your WordPress admin dashboard
2. Go to **Users > Profile** (or click your username in the top right)
3. Scroll down to **Application Passwords**
4. Enter a name for the application (e.g., "Raycast")
5. Click **Add New Application Password**
6. Copy the generated password (spaces don't matter)

### Configure the Extension

1. Open Raycast and search for any WordPress Manager command
2. You'll be prompted to configure the extension:
   - **Site URL**: Your WordPress site URL (e.g., `https://example.com`)
   - **Username**: Your WordPress username
   - **Application Password**: The password you generated above

## Commands

| Command           | Description                          |
| ----------------- | ------------------------------------ |
| Manage Posts      | View, create, edit, and delete posts |
| Manage Pages      | View, create, edit, and delete pages |
| Quick Post        | Create a new post quickly            |
| Moderate Comments | Approve, spam, or trash comments     |
| Media Library     | Browse and manage media files        |
| Manage Users      | View and manage WordPress users      |
| Manage Plugins    | Activate and deactivate plugins      |
| Site Dashboard    | View site info and quick links       |
| Search Content    | Search across all content            |

## Keyboard Shortcuts

### Common Actions
- `⌘ + O`: Open in browser
- `⌘ + E`: Edit in Raycast
- `⌘ + ⇧ + E`: Edit in WordPress admin
- `⌘ + ⇧ + C`: Copy URL
- `⌘ + R`: Refresh
- `⌘ + N`: Create new

### Posts & Pages
- `⌘ + ⇧ + P`: Publish
- `⌘ + ⇧ + D`: Save as draft (Quick Post)
- `⌃ + X`: Delete permanently

### Comments
- `⌘ + A`: Approve comment
- `⌘ + S`: Mark as spam
- `⌘ + ⌫`: Move to trash

## Troubleshooting

### "401 Unauthorized" Error

- Verify your username is correct
- Regenerate your Application Password and update the extension settings
- Ensure Application Passwords are enabled on your site

### "403 Forbidden" Error

- Check that your user role has permission for the action
- Some security plugins may block REST API access. Check your security plugin settings.
- Ensure the REST API is not restricted by your hosting provider

### "Connection Error"

- Verify your Site URL is correct and includes `https://`
- Check that your WordPress site is accessible
- Ensure the REST API is not disabled

### Plugin Management Not Working

- Plugin management requires Administrator role
- Some managed hosting providers restrict plugin management via API

## Privacy & Security

- Your Application Password is stored securely in Raycast's encrypted preferences
- All API requests are made directly from your computer to your WordPress site
- No data is sent to third parties

## Limitations

- Media upload is not supported (WordPress REST API limitation for direct uploads)
- Theme management is not available via the REST API
- Some actions require specific user permissions

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Ensure you're running the latest version of WordPress
3. Verify your Application Password is valid by testing in the WordPress admin

## License

MIT License
