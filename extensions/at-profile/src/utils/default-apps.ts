// Editable default apps list
//
// You can customize this list to change which apps appear in the dropdowns
// for commands like `src/quick-open.tsx` and `src/open-profile.tsx`.
// Each entry defines:
// - name: Display name shown in Raycast
// - value: Stable identifier (used internally)
// - urlTemplate: URL pattern; `{profile}` will be replaced with the username/handle
// - placeholder: Optional hint text shown in input fields
//
// Tip: After editing, run the extension to see your changes reflected.
import { App } from "../types";

export const defaultApps: App[] = [
  {
    name: "Bluesky",
    value: "bluesky",
    urlTemplate: "https://bsky.app/profile/{profile}",
    placeholder: "username.bsky.social",
  },
  {
    name: "Raycast",
    value: "raycast",
    urlTemplate: "https://www.raycast.com/{profile}",
    placeholder: "username",
  },
  {
    name: "Threads",
    value: "threads",
    urlTemplate: "https://www.threads.net/@{profile}",
    placeholder: "username",
  },
  {
    name: "X",
    value: "x",
    urlTemplate: "https://x.com/{profile}",
    placeholder: "username",
  },
  {
    name: "GitHub",
    value: "github",
    urlTemplate: "https://github.com/{profile}",
    placeholder: "username",
  },
  {
    name: "Facebook",
    value: "facebook",
    urlTemplate: "https://www.facebook.com/{profile}",
    placeholder: "username",
  },
  {
    name: "Reddit",
    value: "reddit",
    urlTemplate: "https://www.reddit.com/user/{profile}",
    placeholder: "username",
  },
  {
    name: "YouTube",
    value: "youtube",
    urlTemplate: "https://www.youtube.com/user/{profile}",
    placeholder: "username",
  },
  {
    name: "Instagram",
    value: "instagram",
    urlTemplate: "https://www.instagram.com/{profile}",
    placeholder: "username",
  },
  {
    name: "LinkedIn",
    value: "linkedin",
    urlTemplate: "https://www.linkedin.com/in/{profile}",
    placeholder: "username",
  },
  {
    name: "TikTok",
    value: "tiktok",
    urlTemplate: "https://www.tiktok.com/@{profile}",
    placeholder: "username",
  },
];
