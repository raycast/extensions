# Link Cleaner

Quickly remove tracking parameters in URLs.

## Supported Sites

| Category | Sites |
|---|---|
| Search Engines | Google, Baidu, Bing, DuckDuckGo |
| Video | YouTube, Bilibili, TikTok, Douyin, Netflix |
| Music | Netease Music, Spotify, Apple Music |
| Social Media | Twitter/X, Instagram, Facebook, Reddit, Weibo, Zhihu, Xiaohongshu, Pinterest, LinkedIn, Threads |
| E-commerce | Amazon, Taobao, Tmall, JD |
| Developer | GitHub, Stack Overflow |

For URLs not matching any rule above, Link Cleaner will use **Raycast AI** (requires Pro) to identify tracking parameters, or fall back to a built-in blacklist of common trackers (`utm_*`, `fbclid`, `gclid`, etc.).

## Example

```
"Here is a link to Google: https://www.google.com/search?q=link%2Bcleaner&oq=link%2Bcleaner&aqs=chrome..69i57xxxx&sourceid=chrome&ie=UTF-8"
👇
"Here is a link to Google: https://www.google.com/search?q=link%2Bcleaner&ie=UTF-8"
```
