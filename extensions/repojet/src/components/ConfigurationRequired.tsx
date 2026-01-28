import { Detail, Icon, Color } from "@raycast/api";

interface ConfigurationRequiredProps {
  missingToken: boolean;
  missingOrganizations: boolean;
}

export default function ConfigurationRequired({
  missingToken,
  missingOrganizations,
}: ConfigurationRequiredProps) {
  const steps: string[] = [];

  if (missingToken) {
    steps.push(
      "1. **Add GitHub Token**: Go to [GitHub Settings → Personal Access Tokens](https://github.com/settings/tokens) and create a new token with `repo` scope (read-only access).",
    );
  }

  if (missingOrganizations) {
    steps.push(
      `${missingToken ? "2" : "1"}. **Add Organizations**: Enter the organization names you want to search (comma-separated).`,
    );
  }

  return (
    <Detail
      markdown={`# 🔧 Configuration Required

${steps.join("\n\n")}

---

### Why do I need these?

- **GitHub Token**: Allows the extension to authenticate with GitHub API and access your organizations
- **Organizations**: Specifies which GitHub organizations to search for repositories

Once configured, you'll be able to search repositories across your organizations instantly.`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Status"
            text="Configuration Incomplete"
            icon={{ source: Icon.Warning, tintColor: Color.Orange }}
          />
          {missingToken && (
            <Detail.Metadata.Link
              title="GitHub Tokens"
              target="https://github.com/settings/tokens"
              text="Create Token"
            />
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Required Scope"
            text="repo (read-only)"
          />
        </Detail.Metadata>
      }
    />
  );
}
