# Buffer

Create posts and capture ideas in [Buffer](https://buffer.com) without leaving Raycast.

## Features

- **Create Post** — publish or schedule a post to any connected Buffer channel
- **Create Idea** — capture a content idea for later
- **Flexible Scheduling** — share now, add to queue, share next, or schedule for a custom date/time
- **Media Support** — attach an image or video, with optional alt text and thumbnail
- **Network-Specific Fields** — dedicated options for Instagram, Facebook, Pinterest, YouTube, and Google Business Profile

## Getting Started

1. Get your Buffer API token from [publish.buffer.com/settings/api](https://publish.buffer.com/settings/api).
2. Run any command in this extension for the first time — Raycast will prompt you for the **API Token** preference.

## Commands

### Create Post

| Field           | Description                                                                                                       |
| --------------- | ----------------------------------------------------------------------------------------------------------------- |
| Organization    | Only shown if your account has more than one organization                                                         |
| Channel         | The connected Buffer channel to post to                                                                           |
| Post Text       | The content of the post                                                                                           |
| Share Mode      | Share Now, Add to Queue, Share Next, or Custom Schedule                                                           |
| Schedule For    | Date/time, shown only for Custom Schedule                                                                         |
| Scheduling Mode | Automatic or Notification (manual approval), shown for channels that support it (e.g. Instagram, TikTok, YouTube) |
| Attachment      | None, Image, or Video — options are filtered to what the selected channel supports                                |
| Image/Video URL | Public HTTP(S) URL to the media, plus optional alt text and thumbnail for images                                  |

Selecting certain channels reveals extra fields specific to that network (e.g. Pinterest board and title, YouTube title/category/privacy, Facebook link attachment or first comment, Google Business post type).

### Create Idea

| Field        | Description                                               |
| ------------ | --------------------------------------------------------- |
| Organization | Only shown if your account has more than one organization |
| Title        | Optional headline for the idea                            |
| Content      | The body of the idea                                      |

## Resources

- [Buffer](https://buffer.com)
- [Buffer Developer Portal](https://developers.buffer.com/)

## License

[MIT](LICENSE.md)
