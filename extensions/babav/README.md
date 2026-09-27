# BABAV

Your BABAV brand, one keystroke away. Find anyone in your people, save a lead from whatever you
are reading, approve the replies and posts waiting for you, answer a message in your brand voice,
see who just turned hot, and book a meeting, all without opening the dashboard.

Works on macOS and Windows. The menu bar command is Mac only.

## Commands

| Command | What it does |
| --- | --- |
| **Find Person** | Search your people and leads by name, email, phone or company. See their last message, then call, text, email, copy their details or open them in BABAV. |
| **Add Lead** | Select text (an email signature, a profile, a note) or copy it, run Add Lead, check the filled-in form and save. |
| **Approve Queue** | Every reply, draft and post waiting for your OK. **Enter** approves. **⌘⌫** (Ctrl+Backspace on Windows) rejects. |
| **Quick Reply** | Select the message you are answering, pick where it is, and get a reply in your brand voice. It is copied to your clipboard. |
| **Hot Leads** | Leads whose score crossed your hot line, newest first. |
| **BABAV Menu Bar** | Hot leads, missed calls and items waiting for approval, always in view. Refreshes every 5 minutes. Mac only. |
| **Switch Brand** | If you run more than one brand, choose which one the other commands act on. |
| **Book a Meeting** | Copy your booking link, or pick an open time and book someone in. They get the invite and reminders. |

## Setup

1. You need a BABAV account. Start at [babav.co](https://babav.co).
2. In BABAV, open **Settings › Extensions & apps › Key** and copy your connection key. It starts
   with `bvk_` and is the same key BABAV Finder and BABAV Compose use.
3. Run any BABAV command in Raycast. It opens **Connect your BABAV account**: press ↵ for
   **Get my key**, copy the key, come back and paste it. You'll see ✓ Connected as your brand.
   (You can also paste it in the extension preferences, which win if both are set.)

Leave **API Base URL** as it is unless BABAV support asks you to change it.

### More than one brand

A key belongs to one brand. Use your **main** brand's key to switch between all your brands with
**Switch Brand**. A key made inside another brand only ever sees that brand.

## Privacy and billing

- Everything goes straight to BABAV over HTTPS with your key. Nothing is stored anywhere else.
- Phone numbers you save are added to your people only. BABAV never texts a number because you
  saved it here.
- **Quick Reply** counts as one reply on your plan, the same as a reply written anywhere else in
  BABAV. Everything else is free to use.

## Support

Email [support@babav.co](mailto:support@babav.co) or open BABAV and use Help.
