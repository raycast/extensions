# SocialFaktory

Write X and LinkedIn posts in your brand's voice, and track scheduled posts and credits across TikTok, Instagram, YouTube, X, LinkedIn, Facebook and Pinterest, without leaving Raycast.

[SocialFaktory](https://www.socialfaktory.com) runs a brand's social media from one place: it writes posts in the brand's own voice, generates short video, and schedules and publishes on TikTok, Instagram, YouTube, X, LinkedIn, Facebook and Pinterest. This extension brings the everyday parts of it to Raycast.

## Commands

- **Write Post**: pick a brand and a platform (X or LinkedIn), describe what the post should say, and get three variants written in the brand's voice. Copy or paste the one you like. If writing takes longer than usual, check on it again within 30 minutes from the same screen or with Check Last Write, without spending credits twice, unless you signed in again in between.
- **Scheduled Posts**: browse your posts by status (scheduled, queued, published, failed or draft) with their time, the link they were released at and their metrics.
- **Credit Balance**: see the credits available to spend, the credits reserved by work in progress and your total.

## AI Extension

Mention `@socialfaktory` in Raycast AI to ask about your posts and credits, or to have a post written for one of your brands. Writing a new post asks for your confirmation first because it reserves 3 credits. Asking again for the same brand, platform and brief within 30 minutes returns the same write and reserves nothing, unless you signed in again in between.

The extension never publishes, schedules or deletes anything. Posts stay yours to send from SocialFaktory.

## Sign In

The first time you run a command, Raycast opens SocialFaktory in your browser. Sign in, choose what the connection may do on the consent screen, and you are sent back to Raycast. You can sign out at any time from the extension preferences, and revoke the connection in SocialFaktory under Settings > API tokens. If a permission is missing or the connection needs renewing, use the Sign in Again action in any SocialFaktory command.

If you prefer a personal access token, create one in SocialFaktory under Settings > API tokens with the `read` and `generate` scopes, and paste it into the API Token field in the extension preferences. The token is used instead of the browser sign in.

## Requirements

- A SocialFaktory account with at least one brand: https://www.socialfaktory.com
- Reading posts and credits is free. Writing posts spends credits and needs an active SocialFaktory plan.

## Learn More

- SocialFaktory: https://www.socialfaktory.com
- Connection and permissions: https://www.socialfaktory.com/docs/mcp
