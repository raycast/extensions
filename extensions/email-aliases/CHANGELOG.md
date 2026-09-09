# Email Aliases Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Generate a plus-addressed or catch-all email alias from the active browser tab
- Multiple accounts, with a picker in the **Build Email Alias** form
- Automatic domain depth as the default: keeps a meaningful subdomain like `nas.example.com`,
  drops single sign-on noise like `login.example.com`, and keeps the tenant on multi-tenant
  platforms such as `mycompany.atlassian.net`
- Public Suffix List aware domain depth, so `amazon.co.uk` no longer collapses to `co.uk`
- Configurable separator, dot replacement, alias template and catch-all template
- Optional date and random-token suffixes so aliases cannot be guessed from the domain
- Copy, paste or both, plus an optional argument for a hand written label
- Reads the current tab from Arc, Dia, Chrome, Brave, Edge, Vivaldi, Opera, Safari, Orion and more,
  with the Raycast browser extension as a fallback
