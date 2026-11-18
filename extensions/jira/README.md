# Jira

Create, access and modify issues and sprints.

## Choosing a Jira site

When you sign in with Jira, set **Jira Site URL** in the extension preferences to choose a specific site, such as `company.atlassian.net`. The site must be accessible to the account you authorize. Without a site preference, the extension uses the first accessible site.

## Company certificates

On supported Node.js runtimes, Jira requests also trust certificates from the operating system certificate store. If your company uses HTTPS inspection, its root certificate must be installed and trusted by your system. Certificate verification remains enabled.

## Logging in with an API token

The Jira extension supports OAuth authentication by default. But if you want, you can log in with an API token instead. To do so, you must:

1. Get an API token as described [here](https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/).
2. Select any command from the Jira extension, then press `⌘` + `K` and scroll down to `Configure Extension`. Enter your email, API token, and Jira site URL (without `https://`) on the right. Note that all three must be provided to use API tokens.

## Note

You can change the default `Git branch name` in preferences; the following keys are available:

- {issueKey}
- {issueSummary}
- {issueSummaryShort}
- {issueType}
- {projectKey}
