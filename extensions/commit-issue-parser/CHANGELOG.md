# Commit Issue Parser Changelog

## [New Additions & Fixes] - 2025-08-22

- Added the `Commit Format` setting to customize the commit format
- Added the `Body Format` setting to customize the body format
- Fixes incorrect value in the body field when using a custom scope
- Fixes the value of the body that corresponded only to the value after the last separator, instead of retrieving the entire string, which may contain separators that should be ignored

## [Initial Version] - 2025-08-05

- Added the `Parse Issue Url` command! 🎉
- Jira, GitHub and GitLab issue URLs are supported
- The entry can contain the url, the commit description and the commit body separated by `,`
