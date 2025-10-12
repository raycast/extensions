import { Action, ActionPanel, Detail, Icon, Color } from "@raycast/api";
import { CatalogPackage } from "./types";
import { CopyPackageReference } from "./copy-package-reference";

interface PackageDetailProps {
  org: string;
  packageName: string;
  packageData: CatalogPackage;
}

export function PackageDetail({ org, packageName, packageData }: PackageDetailProps) {
  function generateMarkdown(): string {
    let markdown = "";

    if (packageData.icon) {
      markdown += `![](${packageData.icon})\n\n`;
    }

    markdown += `# ${packageData.title || packageData.repo}\n\n`;
    markdown += `**Organization:** ${org}\n\n`;

    if (packageData.tagline) {
      markdown += `*${packageData.tagline}*\n\n`;
    }

    if (packageData.description) {
      markdown += `## Description\n\n${packageData.description}\n\n`;
    }

    markdown += `## Package Information\n\n`;
    markdown += `- **Package Name:** ${packageData.repo}\n`;
    markdown += `- **Latest Version:** ${packageData.latest_tag || "Unknown"}\n`;
    markdown += `- **Architectures:** ${packageData.architectures?.join(", ") || "Unknown"}\n`;

    if (packageData.flavors && packageData.flavors.length > 0) {
      markdown += `- **Flavors:** ${packageData.flavors.join(", ")}\n`;
    }

    if (packageData.categories) {
      markdown += `- **Categories:** ${packageData.categories}\n`;
    }

    if (packageData.url) {
      markdown += `- **Repository:** [${packageData.url}](${packageData.url})\n`;
    }

    if (packageData.readme) {
      markdown += `\n## README\n\n${packageData.readme}\n`;
    }

    return markdown;
  }

  const markdown = generateMarkdown();

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Package" text={`${org}/${packageName}`} />
          <Detail.Metadata.Label title="Latest Version" text={packageData.latest_tag || "Unknown"} />
          <Detail.Metadata.TagList title="Architectures">
            {packageData.architectures?.map((arch) => (
              <Detail.Metadata.TagList.Item key={arch} text={arch} color={Color.Blue} />
            ))}
          </Detail.Metadata.TagList>
          {packageData.flavors && packageData.flavors.length > 0 && (
            <Detail.Metadata.TagList title="Flavors">
              {packageData.flavors.map((flavor) => {
                let color: Color | undefined;

                switch (flavor) {
                  case "upstream":
                    color = Color.SecondaryText;
                    break;
                  case "unicorn":
                    color = Color.Purple;
                    break;
                  case "registry1":
                    color = Color.Green;
                    break;
                  default:
                    color = undefined;
                }

                return <Detail.Metadata.TagList.Item key={flavor} text={flavor} color={color} />;
              })}
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.Push
            title="Insert/copy Package Reference"
            icon={Icon.Clipboard}
            target={<CopyPackageReference org={org} packageName={packageName} packageData={packageData} />}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          {packageData.url && (
            <Action.OpenInBrowser
              title="Open Repository"
              url={packageData.url}
              icon={Icon.Globe}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          )}
          <Action.CopyToClipboard
            title="Copy Package Name"
            content={`${org}/${packageName}`}
            icon={Icon.Text}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          {packageData.latest_tag && (
            <Action.CopyToClipboard
              title="Copy Latest Version"
              content={packageData.latest_tag}
              icon={Icon.Tag}
              shortcut={{ modifiers: ["cmd"], key: "v" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
