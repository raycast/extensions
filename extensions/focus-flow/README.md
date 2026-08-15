# FocusFlow - a Study Clock

**FocusFlow** is a Raycast extension that helps you stay accountable by tracking focused study or work sessions (*FOCUS*) — and adds a bit of friendly competition through team collaboration (*FLOW*).

---

## 👥 Team Collaboration

Want to track progress as a group, compete on a leaderboard, or just motivate each other? Here’s how to set up team mode using Discord webhooks.

### For Team Leaders:

1. **Create a Discord Webhook**
   In your Discord server, go to:
   **Server Settings** → **Integrations** → **Webhooks** → **New Webhook** → **Copy Webhook URL**

2. **Create a Team in Raycast**
   Use the `Create Team` command in Raycast.
   Paste the webhook URL, set a team name and your username.
   You’ll receive a **Team Code** — share this with your teammates.

### For Team Members:

1. **Join a Team**
   Use the `Join Team` command and paste the Team Code your team leader gave you.

> **Note:** You don’t need to join the Discord server to be part of a FocusFlow team. The extension uses a special link (called a webhook) to send and receive updates behind the scenes. That means your progress will still show up on the team leaderboard — even if you’re not in the Discord channel where updates are posted.

---

## 🌐 Use FocusFlow on the Web

Have a fussy friend who would prefer not to download Raycast? You can also use **FocusFlow** directly in your browser:  
👉 [focusflowweb.vercel.app](https://focusflowweb.vercel.app)

no installation required — exact same features 👍

---

## ⚙️ Why Discord Webhooks? (The Technical Bit)

FocusFlow uses Discord webhooks not just for sending updates, but as a **lightweight serverless backend**.

Webhooks allow the extension to:

* Post real-time session activity to your Discord channel
* Store and retrieve team data (like sessions and leaderboard scores)
* Avoid the need for a hosted backend or custom API

This makes FocusFlow fast to set up, easy to maintain, and ideal for small teams or student groups who don’t want to manage servers.

---

## 🔐 Security Note — Please Read

**Your Webhook URL and Team Code are private.** Anyone with access can post messages to your Discord channel and potentially alter team data.

Here’s how to keep things safe:

* **Only share your Team Code with people you fully trust.**
* **Treat the Webhook URL like a password.** If you think it’s been exposed, delete the webhook in Discord and create a new one.
* **Use a dedicated channel (or server) for FocusFlow.** Ideally, use a private space with limited access.
* **Keep your team small and trusted.** The maximum team size is 10 members. Fewer people = lower risk of misuse.
