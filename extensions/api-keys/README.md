# API Keys / Credentials - Raycast Extension

Quick access to API key and credential dashboards across all your providers.

## Features

- Search through 50+ provider dashboards
- Organized by category (AI/ML, Payments, Cloud, Database, DevOps, Email, Auth, Analytics, Storage, Productivity, Government, Media)
- Favicon icons for each provider
- Open dashboard directly in browser
- Copy dashboard URL to clipboard

## Commands

### API Keys / Credentials

Search and open any provider's API key or credential management dashboard.

## Categories

- **AI/ML**: OpenAI, Anthropic, Google AI, Cohere, Replicate, Groq
- **Payments**: Stripe, PayPal, Lemon Squeezy, Paddle
- **Cloud**: AWS, GCP, Azure, Cloudflare, DigitalOcean
- **Database**: Supabase, MongoDB Atlas, PlanetScale, Neon, Vercel Postgres
- **DevOps**: Vercel, Railway, Render, Fly.io, Heroku
- **Email**: Resend, SendGrid, Postmark, AWS SES
- **Auth**: Clerk, Auth0, Supabase Auth, Firebase Auth
- **Analytics**: Plausible, PostHog, Google Analytics, Mixpanel
- **Storage**: AWS S3, Cloudflare R2, Backblaze, Firebase Storage
- **Productivity**: Linear, Tally, Plane, Luma, Asana
- **Government**: Companies House
- **Media**: remove.bg

## Development

```bash
npm install
npm run dev
```

## Providers API

Provider data is loaded from the hosted catalog and cached by the Raycast
command:

```text
https://creds.raggle.co/api.json
```

## Adding New Providers

Add or edit provider JSON files in the provider catalog repository:

```text
providers/provider-name.json
```

Then publish the catalog so the extension can read the updated
`https://creds.raggle.co/api.json` response.

Provider URLs can include placeholders for account-specific values. The command
will ask for these values once and save them in Raycast local storage:

```json
{
  "name": "Provider Name",
  "url": "https://dashboard.url/{workspace-slug}/api-keys",
  "category": "Category",
  "domain": "dashboard.url",
  "variables": [
    {
      "key": "workspace-slug",
      "label": "Workspace Slug",
      "placeholder": "acme"
    }
  ]
}
```
