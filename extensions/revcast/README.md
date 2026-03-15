# Revcast

Revcast is a Raycast extension for Stripe-backed SaaS founders who want revenue answers without opening another dashboard.

This repository contains:

- The Raycast extension users install from Raycast
- A Next.js website used for pricing, checkout, and license activation

Core commands:

- `rev`: revenue snapshot with today revenue, MRR, new customers, and failed payments
- `failed`: failed payment review workflow
- `projects`: local Stripe project management and project switching
- `license`: paid-plan activation and billing actions

## What It Does

- Local-first storage with Raycast `LocalStorage`
- Demo mode for trying the extension without a Stripe key
- Short-lived caching for Stripe responses to reduce duplicate API work
- Request cancellation and race protection when switching projects or refreshing quickly
- Typed service layer so UI components stay separated from Stripe logic
- Optional Pro plan powered by Dodo-hosted checkout and device activation

## Commands

### `rev`

Shows:

- Today revenue
- Monthly recurring revenue
- New customers
- Failed payments and revenue at risk

Actions:

- Refresh metrics
- Copy snapshot
- Open Stripe dashboard
- View failed payments

### `failed`

Shows all failed invoices that still have money at risk.

Actions:

- Open in Stripe
- Copy customer email
- Mark reviewed / unreviewed
- Refresh

### `projects`

Manages locally stored Stripe projects.

Actions:

- Add a project
- Set active project
- Open Stripe dashboard
- Remove a project
- Re-enable demo mode

### `license`

Shows:

- Current license status
- Active plan and device activation details
- Billing and subscription state for Pro customers

Actions:

- Activate or replace a license
- Refresh license status
- Open billing portal
- Release the current device activation
- Clear local license state

## Demo Mode

If no Stripe project exists, onboarding offers `View Demo Metrics`. That creates a local demo project and serves data from [src/lib/demo-data.ts](/Users/bharath/Downloads/raycast-app/src/lib/demo-data.ts) instead of calling Stripe.

## Stripe Test Mode Setup

You do not need a live Stripe key for development. Use a test secret key instead.

### Get a test key

1. Create or log into your Stripe account.
2. Turn on `Test mode` in the Stripe Dashboard.
3. Open `Developers` -> `API keys`.
4. Copy the `Secret key` that starts with `sk_test_`.

Use that key in the `projects` command when adding a Stripe project.

### Important key types

- `sk_test_...`: test secret key, correct for this extension
- `pk_test_...`: test publishable key, not correct for this extension
- `sk_live_...`: live secret key, do not use for local development

### If your test account is empty

The extension may show zero revenue and no failed payments even though the key is valid. That usually means your Stripe test workspace has no test data yet.

To generate useful data in Stripe Test mode, create:

- test customers
- test products and prices
- test subscriptions
- test invoices
- test payment attempts

Once those exist, refresh the `rev` or `failed` command in Raycast.

## Architecture

```text
Raycast Commands
  -> components/
  -> hooks/
  -> lib/storage.ts
  -> lib/stripe-metrics-service.ts
  -> Stripe REST API
```

Important files:

- [src/rev.tsx](/Users/bharath/Downloads/raycast-app/src/rev.tsx)
- [src/failed.tsx](/Users/bharath/Downloads/raycast-app/src/failed.tsx)
- [src/projects.tsx](/Users/bharath/Downloads/raycast-app/src/projects.tsx)
- [src/lib/stripe-metrics-service.ts](/Users/bharath/Downloads/raycast-app/src/lib/stripe-metrics-service.ts)
- [src/lib/storage.ts](/Users/bharath/Downloads/raycast-app/src/lib/storage.ts)

## Repository Structure

```text
.
├── src/                 # Raycast extension source
├── website/             # Next.js landing page + Dodo checkout
└── docs/                # Brand, copy, pricing, launch notes
```

## Development

### Requirements

- Node.js
- npm
- Raycast app installed locally

### Install

```bash
npm install
```

### Run the Raycast extension

```bash
npm run dev
```

### Build the Raycast extension

```bash
npm run build
```

### Run the landing page

```bash
npm run website:dev
```

The website expects the variables in [website/.env.example](/Users/bharath/Downloads/raycast-app/website/.env.example).

### Billing and activation

Revcast supports Dodo-hosted checkout plus device activation:

- Dodo webhook endpoint: `/api/dodo/webhook`
- License activation API: `/api/license/activate`
- License validation API: `/api/license/validate`

For this flow to work end-to-end you need:

- `DODO_PAYMENTS_API_KEY`
- `DODO_PAYMENTS_WEBHOOK_KEY`
- `DODO_PRODUCT_ID_PRO`
- a persistent `DATABASE_URL` for the website workspace

Products in Dodo should have license keys enabled. The Raycast extension uses the `License & Billing` command to activate a purchased Pro license on the current device.

For local development or self-hosting, set the Raycast extension preference `Revcast Cloud URL` to your deployed website URL. Stripe project credentials remain local to the Raycast extension in v1, and the hosted website is used only for checkout plus license APIs.

### Build the landing page

```bash
npm run website:build
```

### Lint

```bash
npm run lint
```

### Format

```bash
npm run format
```

### Test

```bash
npm run test
```

## Stripe Data Notes

The live snapshot currently computes:

- MRR from subscription prices normalized to monthly revenue
- Today revenue from successful `payment_intents`
- New customers from customers created today
- Failed payments and revenue at risk from open invoices with at least one payment attempt

This is intentionally MVP-oriented and local-first. There is no backend yet.

## Quality Guardrails

- Aborts in-flight Stripe requests when a newer request starts
- Ignores stale responses that resolve after a newer request
- Caches snapshot and failed-payment results briefly per project
- Unit tests cover MRR normalization and snapshot aggregation
- ESLint and Prettier are configured for local validation
- The website uses mostly static rendering for a fast landing page experience
- Paid plan checkout is handled through Dodo-hosted checkout sessions

## Raycast Store Launch Checklist

Before submitting Revcast to the Raycast Store:

1. Deploy the website and license APIs to a public URL.
2. Replace the temporary `Revcast Cloud URL` testing flow with that public hosted URL for the store build.
3. Capture polished command screenshots or GIFs for the store listing.
4. Run `npm run lint`, `npm run build`, and `npm run test`.
5. Submit the extension through Raycast's publishing flow with this README and `CHANGELOG.md`.
