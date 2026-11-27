# SEOmatic

Use [SEOmatic](https://seomatic.ai), the SEO agent for your own website, from
Raycast. The extension calls the SEOmatic REST API
(`https://app.seomatic.ai/api/v1`) with your workspace API key.

## Commands

- **Ask SEOmatic**: ask a question in plain language ("Which keywords are
  closest to page 1?"). SEOmatic answers from your workspace's real data with
  the same tools as its MCP server, and lists the tools it used. Each question
  counts against your workspace's monthly question allowance; on the free plan
  the answer shows how many free questions are left.
- **Check Page**: score one public page for AI answerability (structure,
  schema, content, entities, questions) and list the issues to fix. This check
  is free: it uses no questions or credits.
- **Show Approvals**: the fixes SEOmatic staged that wait for your approval
  (up to 20 shown). Open one in SEOmatic to review it. Changes that can remove
  a page from Google (noindex, redirects, pruning) never get a one-click
  approve link and always open the full review.
- **Search Pages** and **Search Keywords**: your top 100 pages or search
  queries from Google Search Console over the last 28 days, with clicks,
  impressions, CTR and average position. Type to filter.

## Setup

1. Sign in at [app.seomatic.ai](https://app.seomatic.ai). Connect Google
   Search Console there for the Search Pages and Search Keywords commands.
2. Create an API key in **Settings > AI Agents > API Keys**
   ([direct link](https://app.seomatic.ai/dashboard/settings?tab=ai-agents)).
   Creating a key needs the admin role on the workspace. Keys start with
   `smk_live_`.
3. Paste the key into the extension's **API Key** preference when Raycast
   asks for it.

Nothing in this extension changes your site. Approving a fix happens in
SEOmatic, signed in as a member of your workspace.

## Privacy and support

Requests go to app.seomatic.ai with your API key and act on your SEOmatic
workspace. Privacy policy: https://seomatic.ai/privacy. Support:
contact@seomatic.ai.
