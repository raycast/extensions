# Outseta for Raycast

Look up people and accounts, and triage support cases in your [Outseta](https://www.outseta.com) account without leaving Raycast.

This is an unofficial community extension, built and maintained independently of Outseta. The Outseta name and logo are used with permission.

## Commands

- **Search People** — find a person, see their account, plan, subscription status and last login.
- **Search Accounts** — find an account, see its plan, status, renewal date and members.
- **Support Cases** — browse unassigned, assigned-to-me, open or closed cases and reply to them.

## Setup

1. In Outseta, go to **Settings → Integrations → API Keys** and create a key.
2. Open the extension preferences in Raycast and fill in your subdomain, API key and secret key.
3. Optionally set your agent name: customers see it as the sender of your replies. Without it, replies are signed with your company name.

To use the "Assigned to Me" filter in Support Cases, run "This Is Me" on any case assigned to you.

### Demo mode

Set the subdomain to `demo` and type anything for the API key and secret key to try the extension with sample data, no Outseta account needed. The sample covers every subscription status and a mix of open, assigned, closed and spam cases. Replies you send in demo mode are kept in memory and never emailed. "Open in Outseta" links don't work in demo mode.

> Outseta API keys have full admin access. The extension only writes when you send a support reply, and always asks for confirmation first.

Windows support is declared but untested — please report if it works for you.

## Roadmap

- Multiple Outseta accounts
- Admin actions: create people, change plans, manage email lists
- Change case status
- Combined search across people, accounts and cases
- Menu bar metrics
- Knowledge base articles
- Markdown replies
- Estimated MRR

## Development

```sh
npm install
npm run dev     # run in Raycast
npm test        # unit tests
npm run lint
```

Set the subdomain to `demo` to develop against the sample data in `src/lib/demo/` without touching a real account.

Raw API responses saved during development go in `fixtures/raw/` (gitignored). Only scrubbed fixtures in `fixtures/` are committed.
