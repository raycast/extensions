import { Detail, Icon, Color } from "@raycast/api";

interface InvalidTokenProps {
  scopes?: string[];
}

export default function InvalidToken({ scopes }: InvalidTokenProps) {
  return (
    <Detail
      markdown={`# 🔒 Invalid or Unsafe Token

⚠️ **Security Warning**: Your GitHub token has write or admin permissions that this extension does not need.

### Why is this a problem?

For security reasons, this extension only requires **read-only** access to repositories. Using a token with write or admin permissions creates unnecessary security risks:

- If the token is compromised, it could be used to modify or delete your repositories
- Following the principle of least privilege improves security
- Read-only tokens are safer and sufficient for searching repositories

### What you need to do:

1. Go to [GitHub Settings → Personal Access Tokens](https://github.com/settings/tokens)
2. Create a new token with **only** the \`repo\` scope (read-only)
3. Update the token in this extension's preferences

### Current Token Issues:

Your token may have one or more of these dangerous scopes: \`delete_repo\`, \`workflow\`, \`admin:org\`, or \`write:repo_hook\`.`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Security Status"
            text="Token Has Excessive Permissions"
            icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
          />
          <Detail.Metadata.Link
            title="GitHub Tokens"
            target="https://github.com/settings/tokens"
            text="Create New Token"
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Required Scope"
            text="repo (read-only)"
            icon={Icon.Check}
          />
          {scopes && scopes.length > 0 && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.TagList title="Current Scopes">
                {scopes.map((scope) => (
                  <Detail.Metadata.TagList.Item
                    key={scope}
                    text={scope}
                    color={Color.Orange}
                  />
                ))}
              </Detail.Metadata.TagList>
            </>
          )}
        </Detail.Metadata>
      }
    />
  );
}
