# Propose Times

A Raycast extension that pulls your SavvyCal or Cal.com availability and generates a message with specific times—in the recipient's timezone, with one-click booking.

**Smart scheduling:** Times are batched around your existing meetings (not scattered randomly throughout the day), and your scheduling preferences (buffer times, working hours, etc.) are automatically respected.

<img width="1598" height="566" alt="Frame 2" src="https://github.com/user-attachments/assets/b7689fc3-6647-4035-beaa-4c3bcbda189e" />


**Works with [SavvyCal-Booker](https://github.com/skinnyandbald/savvycal-booker)** for true one-click booking (optional).

## Why I Built This

I've been frustrated by scheduling for years. Tried a bunch of approaches: autonomous agents, back-and-forth over email, just sending my scheduling link.

The problem with scheduling links is they put all the work on the other person. They have to open your calendar, scan through days, pick a time, fill out a form. It feels lazy on your end.

Proposing specific times is more respectful. The recipient can click one time and book instantly. If none work, they still have your full calendar as a fallback. And every time is shown in *their* timezone—no mental math required.

## How It Works

1. Open Raycast → "Propose Times"
2. Pick date range, duration, recipient's timezone
3. Hit Enter → message copied to clipboard
4. Paste into email or Slack

The extension doesn't just grab random open slots. It intelligently batches times around your existing calendar—so if you have a 10am call, it suggests 9:30 or 11:00 instead of scattering meetings throughout your day. And because it integrates directly with Cal.com and SavvyCal, it automatically respects the scheduling preferences you've set up there.

## What It Generates

```
Would any of these times work for a 25 min meeting (ET)?
• Mon, Jan 6: 9:00am, 10:30am, 2:00pm, 4:00pm
• Tue, Jan 7: 9:30am, 11:00am, 3:00pm
• Wed, Jan 8: 10:00am, 1:00pm, 3:30pm

Feel free to use this booking page if that's easier (also contains more availabilities):
https://savvycal.com/you/chat
```

Each time is a link. Click → booking form → done.

## What You'll Need

### Required

**Raycast** — A Mac app that lets you quickly launch commands with a keyboard shortcut. Think of it like Spotlight, but way more powerful.
- 🖥️ **Mac only** (sorry, no Windows/Linux)
- 💰 **Free** — The free version has everything you need. Pro is $8/month but not required.
- 🔗 [Download Raycast](https://raycast.com)

**A scheduling account** — Either one:
- [SavvyCal](https://savvycal.com) — Starts at $12/month
- [Cal.com](https://cal.com) — Free tier available

### Optional

**One-click booking** requires deploying a small web app (see [One-Click Booking](#one-click-booking) below). Without it, time slots still link to your calendar page—just with an extra step for the booker.

---

## Installation

This extension isn't in the Raycast Store (yet), so you'll install it as a "Developer Extension." Don't worry—it's straightforward.

### Prerequisites

You'll need **Node.js** installed on your Mac. To check if you have it:

1. Open **Terminal** (press `⌘ + Space`, type "Terminal", hit Enter)
2. Type `node --version` and press Enter

If you see a version number (like `v20.10.0`), you're good. If you see "command not found":
- 🔗 [Download Node.js](https://nodejs.org) — choose the "LTS" version, run the installer

### Step-by-Step Installation

**Step 1: Download the code**

**Option A: Download ZIP (easiest)**

1. Go to [github.com/skinnyandbald/propose-times](https://github.com/skinnyandbald/propose-times)
2. Click the green **"Code"** button
3. Click **"Download ZIP"**
4. Unzip the downloaded file (double-click it)
5. Rename the folder from `propose-times-main` to `propose-times` (optional but cleaner)

**Option B: Use git (if you have it)**

Open Terminal and run:
```bash
git clone https://github.com/skinnyandbald/propose-times.git
```

**Step 2: Install and register with Raycast**

Open Terminal, navigate to the folder, and run:

```bash
cd ~/Downloads/propose-times
```
(adjust the path if you put it somewhere else—`git clone` puts it in your home folder)

```bash
npm install && npm run dev
```

This installs dependencies and **automatically registers** the extension with Raycast. You'll see "Propose Times" appear in Raycast immediately.

Once it's registered, you can press `Ctrl + C` to stop the dev server—the extension stays installed.

### Quick Access (Optional but Recommended)

Assign a keyboard shortcut so you can launch it instantly:

1. In Raycast, search for "Propose Times"
2. Press `⌘ + K` to open the action menu
3. Select **Configure Command**
4. Set a **Hotkey** (e.g., `⌘ + ⇧ + P`)

### Troubleshooting

**"git: command not found"**
- Install Xcode Command Line Tools: open Terminal, run `xcode-select --install`

**"npm: command not found"**
- Install Node.js from [nodejs.org](https://nodejs.org)

**Can't find the propose-times folder?**
- If you downloaded the ZIP, it's in `~/Downloads/propose-times-main`
- If you used `git clone`, it's in whichever folder you ran the command from

**Extension not showing in Raycast?**
- Make sure `npm run dev` completed without errors
- Try running `npm run dev` again

---

## Development

If you want to make changes to the extension:

```bash
npm run dev  # Hot-reloads changes, but terminal must stay open
```

### Configuration

Choose your calendar provider in extension preferences:

#### SavvyCal

| Setting | What it is |
|---------|------------|
| **Provider** | Select "SavvyCal" |
| **SavvyCal API Token** | Get it from [SavvyCal Settings](https://savvycal.com/settings/integrations) |
| **Link Slug** | The `chat` part of `savvycal.com/you/chat` |
| **Username** | Your SavvyCal username |

#### Cal.com

| Setting | What it is |
|---------|------------|
| **Provider** | Select "Cal.com" |
| **Cal.com Username** | Your Cal.com username |
| **Cal.com Event Slug** | The event type slug (e.g., `pow-wow` from `cal.com/you/pow-wow`) |

#### Common Settings

| Setting | What it is |
|---------|------------|
| **Default Timezone** | Recipient's default timezone |
| **Booker URL** | (Optional) Your SavvyCal-Booker deployment URL for one-click booking |

## One-Click Booking (Optional)

By default, time slots link to your SavvyCal or Cal.com page for that day—but the recipient still has to find and click the specific time slot. Neither service supports pre-selecting a time via URL.

With the companion app, clicking a time opens a simple form with that slot pre-filled—enter name/email, submit, done:

### What's Vercel?

**Vercel** is a hosting service that runs small web apps for free. You don't need to understand how it works—just click the button below and follow the prompts.

- 💰 **Free** — The free tier handles plenty of bookings. Paid plans start at $20/month if you outgrow it.
- 🔗 [Learn more about Vercel](https://vercel.com)

### Deploy in 2 Minutes

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fskinnyandbald%2Fsavvycal-booker&env=SAVVYCAL_TOKEN,CALCOM_API_KEY&envDescription=API%20tokens%20for%20your%20calendar%20providers&envLink=https%3A%2F%2Fsavvycal.com%2Fsettings%2Fintegrations)

1. Click the button above (you'll create a free Vercel account if you don't have one)
2. Add your API token(s) when prompted
3. Click Deploy
4. Copy your new URL and add it to **Booker URL** in the Raycast extension preferences

## License

MIT
