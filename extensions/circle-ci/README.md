# CircleCI Workflows

Extension for quickly visualize CircleCI Workflows status.

## How to get API Token

1. Open https://app.circleci.com/settings/user/tokens.
2. Click "Create New Token".
3. Name it (eg: "Raycast")
4. Here is your API Token.

## How to get Organization Slug

1. Open a Terminal.
2. Run the following curl command with your previously retrieved API Token.

```bash
curl --request GET \
  --url https://circleci.com/api/v2/me/collaborations \
  --header 'Circle-Token: <YOUR_API_TOKEN_HERE'
```

3. Then you get your organization slug by using the following pattern on the wanted organization entry: `<vcs_type>/<name>` (eg.: `github/qeude`)

_Note: If this instruction wasn't clear, please let me know in [Slack Community](https://raycast.com/community) or feel free to create a PR with improved steps._
