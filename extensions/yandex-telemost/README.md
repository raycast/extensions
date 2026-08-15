# Yandex Telemost

Create and join [Yandex Telemost](https://telemost.yandex.ru) meetings directly from Raycast.

## Commands

- **New Meeting** — Opens Telemost, automatically clicks "Создать видеовстречу", and copies the meeting URL to your clipboard.
- **New Meeting and Refocus** — Same as above, but returns focus to the previous app after copying the link.
- **Join Meeting** — Enter a meeting link or code to open it instantly.

## Setup

### Enable JavaScript from Apple Events in your browser

**New Meeting** uses AppleScript to automate your browser. You need to enable JavaScript from Apple Events once:

**Chrome / Helium / Brave / Edge / Arc and other Chromium-based browsers:**
Menu bar → **View → Developer → Allow JavaScript from Apple Events**

**Safari:**
1. Safari → **Settings → Advanced** → enable "Show features for web developers"
2. Menu bar → **Develop → Allow JavaScript from Apple Events**

After enabling, restart your browser. This is a one-time setup.

## Supported Browsers

Chrome, Safari, Helium, Arc, Brave, Microsoft Edge, Opera, Vivaldi, Zen Browser, Chromium, Dia
