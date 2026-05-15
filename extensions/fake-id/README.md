# FakeID

Generate realistic fake US addresses and identities directly from Raycast. Built with [Faker.js](https://fakerjs.dev/) — offline, no API key required.

## Commands

### Generate Address
Select a US state (or random) and instantly generate a realistic address. Includes a dedicated **Tax-Free States** section (AK, DE, MT, NH, OR) for sales-tax-free addresses. Copy the full address or individual details to your clipboard.

### Generate Identity
Generate a complete fake identity including:
- Full name & gender
- Date of birth & age
- Social Security Number (SSN)
- Phone number & email
- Full US address

Copy any field individually, copy everything at once, or save for later.

### Saved Items
Browse, inspect, and manage identities you've saved. Each entry shows full details with one-click copy for any field. Delete unwanted items when they're no longer needed.

## Features
- **100% offline** — all data generated locally by Faker.js, no network calls
- **State-specific addresses** — pick any US state or let it randomize
- **Tax-free states** — quick access to Alaska, Delaware, Montana, New Hampshire, Oregon
- **Instant clipboard** — copy any field or the entire identity with one action
- **Local persistence** — saved identities stored via Raycast LocalStorage

## Installation

### From Raycast Store
Search for **FakeID** in the Raycast Store and install.

### Local Development
```bash
git clone https://github.com/shenyeah/FakeID.git
cd FakeID
npm install
npm run dev
```
