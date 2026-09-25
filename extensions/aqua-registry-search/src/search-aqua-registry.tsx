import { ActionPanel, Action, List, Icon, Keyboard } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState, useMemo } from "react";
import { parseRegistry, type AquaPackage, type RegistryData } from "./aqua-registry";

// The aggregated registry omits source-directory metadata, so rare mismatches need an explicit path.
const REGISTRY_PATH_OVERRIDES: Record<string, string> = {
  "crates.io/rjo": "crates.io/dskkato/rjo",
};

const REGISTRY_URL = "https://raw.githubusercontent.com/aquaproj/aqua-registry/main/registry.yaml";
const MAX_VISIBLE_PACKAGES = 100;

type RegistryResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  text(): Promise<string>;
};

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [showingDetail, setShowingDetail] = useState(false);
  const [selectedPackageKey, setSelectedPackageKey] = useState<string | null>(null);

  const { data, error, isLoading, revalidate } = useFetch<RegistryData>(REGISTRY_URL, {
    parseResponse: parseFetchResponse,
    keepPreviousData: true,
    failureToastOptions: {
      title: "Couldn't Load Aqua Registry",
    },
  });

  const filteredPackages = useMemo(() => {
    if (!data?.packages) return [];
    const normalizedSearch = searchText.trim().toLowerCase();
    if (!normalizedSearch) return data.packages;

    return data.packages.filter((pkg) => {
      const searchableText = [
        getPackageName(pkg),
        pkg.description,
        pkg.repo_owner,
        pkg.repo_name,
        pkg.path,
        ...(pkg.files?.flatMap((file) => [file.name, file.src]) ?? []),
        ...(pkg.supported_envs ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [data, searchText]);

  const loadError = error && !data?.packages.length ? error : undefined;
  const visiblePackages = filteredPackages.slice(0, MAX_VISIBLE_PACKAGES);
  const resultSubtitle =
    visiblePackages.length === filteredPackages.length
      ? filteredPackages.length.toString()
      : `${visiblePackages.length} of ${filteredPackages.length}`;

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={(value) => {
        setSearchText(value);
        setSelectedPackageKey(null);
      }}
      searchBarPlaceholder="Search Aqua packages..."
      isShowingDetail={showingDetail}
      onSelectionChange={setSelectedPackageKey}
      throttle
    >
      {!isLoading && filteredPackages.length === 0 ? (
        <List.EmptyView
          icon={loadError ? Icon.Warning : Icon.MagnifyingGlass}
          title={loadError ? "Couldn’t Load Aqua Registry" : "No Packages Found"}
          description={
            loadError
              ? loadError.message
              : searchText.trim()
                ? `No packages match “${searchText.trim()}”`
                : "The registry returned no packages"
          }
          actions={
            loadError ? (
              <ActionPanel>
                <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
              </ActionPanel>
            ) : undefined
          }
        />
      ) : (
        <List.Section title="Results" subtitle={resultSubtitle}>
          {visiblePackages.map((pkg, index) => {
            const packageKey = getPackageKey(pkg);
            const isSelected = selectedPackageKey === packageKey || (!selectedPackageKey && index === 0);

            return (
              <PackageListItem
                key={packageKey}
                id={packageKey}
                package={pkg}
                showingDetail={showingDetail}
                isSelected={isSelected}
                onToggleDetail={() => setShowingDetail((currentValue) => !currentValue)}
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}

function PackageListItem({
  package: pkg,
  id,
  showingDetail,
  isSelected,
  onToggleDetail,
}: {
  package: AquaPackage;
  id: string;
  showingDetail: boolean;
  isSelected: boolean;
  onToggleDetail: () => void;
}) {
  const packageName = getPackageName(pkg);
  const githubUrl = getGitHubUrl(pkg);
  const registryUrl = getRegistryUrl(pkg);
  const addCommand = `aqua g -i ${packageName}`;

  const accessories = showingDetail
    ? undefined
    : [
        {
          text: pkg.type,
          tooltip: `Type: ${pkg.type}`,
        },
      ];

  return (
    <List.Item
      id={id}
      title={packageName}
      subtitle={!showingDetail ? pkg.description : undefined}
      accessories={accessories}
      detail={
        showingDetail && isSelected ? (
          <List.Item.Detail
            markdown={getPackageMarkdown(pkg)}
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Package" text={packageName} />
                {pkg.description && <List.Item.Detail.Metadata.Label title="Description" text={pkg.description} />}
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Type" text={pkg.type} />
                {githubUrl && <List.Item.Detail.Metadata.Link title="Repository" target={githubUrl} text={githubUrl} />}
                {registryUrl && (
                  <List.Item.Detail.Metadata.Link title="Registry" target={registryUrl} text={registryUrl} />
                )}
                {pkg.link && <List.Item.Detail.Metadata.Link title="Homepage" target={pkg.link} text={pkg.link} />}
                {pkg.files && pkg.files.length > 0 && (
                  <>
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.TagList title="Binaries">
                      {pkg.files.map((file) => (
                        <List.Item.Detail.Metadata.TagList.Item
                          key={`${file.name}:${file.src ?? ""}`}
                          text={file.src ? `${file.name} ← ${file.src}` : file.name}
                        />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  </>
                )}
                {pkg.supported_envs && pkg.supported_envs.length > 0 && (
                  <>
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.TagList title="Supported Platforms">
                      {pkg.supported_envs.slice(0, 10).map((environment) => (
                        <List.Item.Detail.Metadata.TagList.Item key={environment} text={environment} />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  </>
                )}
              </List.Item.Detail.Metadata>
            }
          />
        ) : undefined
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Add Command" content={addCommand} icon={Icon.Terminal} />
            <Action.CopyToClipboard
              title="Copy Package Name"
              content={packageName}
              icon={Icon.Clipboard}
              shortcut={Keyboard.Shortcut.Common.CopyName}
            />
            {registryUrl && (
              <Action.CopyToClipboard
                title="Copy Registry Link"
                content={registryUrl}
                icon={Icon.Link}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            {githubUrl && <Action.OpenInBrowser title="Open Repository" url={githubUrl} icon={Icon.Code} />}
            {registryUrl && (
              <Action.OpenInBrowser
                title="Open Registry Page"
                url={registryUrl}
                icon={Icon.Book}
                shortcut={Keyboard.Shortcut.Common.Open}
              />
            )}
            {pkg.link && <Action.OpenInBrowser title="Open Homepage" url={pkg.link} icon={Icon.House} />}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Toggle Details"
              icon={Icon.AppWindowSidebarLeft}
              shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
              onAction={onToggleDetail}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function getPackageName(pkg: AquaPackage): string {
  if (pkg.name) return pkg.name;
  if (pkg.repo_owner && pkg.repo_name) {
    return `${pkg.repo_owner}/${pkg.repo_name}`;
  }
  if (pkg.path) return pkg.path;
  return "unknown";
}

function getPackageKey(pkg: AquaPackage): string {
  return `${getRegistryPath(pkg) ?? "unknown"}:${getPackageName(pkg)}`;
}

function getGitHubUrl(pkg: AquaPackage): string | null {
  if (pkg.repo_owner && pkg.repo_name) {
    return `https://github.com/${pkg.repo_owner}/${pkg.repo_name}`;
  }
  return null;
}

function getRegistryUrl(pkg: AquaPackage): string | null {
  const registryPath = getRegistryPath(pkg);
  if (!registryPath) return null;

  const encodedPath = registryPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `https://github.com/aquaproj/aqua-registry/tree/main/pkgs/${encodedPath}`;
}

function getRegistryPath(pkg: AquaPackage): string | null {
  const repositoryPath = pkg.repo_owner && pkg.repo_name ? `${pkg.repo_owner}/${pkg.repo_name}` : null;

  if (pkg.name) {
    return REGISTRY_PATH_OVERRIDES[pkg.name] ?? pkg.name.replace(/#/g, "/");
  }
  if (repositoryPath) return repositoryPath;
  if (pkg.path) return pkg.path;
  return null;
}

function getPackageMarkdown(pkg: AquaPackage): string {
  const packageName = getPackageName(pkg);
  const githubUrl = getGitHubUrl(pkg);
  const registryUrl = getRegistryUrl(pkg);

  let markdown = `# ${packageName}\n\n`;

  if (pkg.description) {
    markdown += `${pkg.description}\n\n`;
  }

  markdown += `**Type:** \`${pkg.type}\`\n\n`;

  if (githubUrl) {
    markdown += `**Repository:** [${githubUrl}](${githubUrl})\n\n`;
  }

  if (registryUrl) {
    markdown += `**Aqua Registry:** [${registryUrl}](${registryUrl})\n\n`;
  }

  if (pkg.link) {
    markdown += `**Homepage:** [${pkg.link}](${pkg.link})\n\n`;
  }

  if (pkg.files && pkg.files.length > 0) {
    markdown += `### Binaries\n\n`;
    pkg.files.forEach((file) => {
      markdown += `- \`${file.name}\`${file.src ? ` ← \`${file.src}\`` : ""}\n`;
    });
    markdown += `\n`;
  }

  markdown += `### Add to aqua.yaml\n\n`;
  markdown += `\`\`\`bash\n`;
  markdown += `aqua g -i ${packageName}\n`;
  markdown += `\`\`\`\n`;

  return markdown;
}

async function parseFetchResponse(response: RegistryResponse): Promise<RegistryData> {
  if (!response.ok) {
    throw new Error(`Failed to fetch registry: ${response.status} ${response.statusText}`.trim());
  }

  const text = await response.text();
  const parsed = parseRegistry(text);

  if (!parsed || !Array.isArray(parsed.packages)) {
    throw new Error("Invalid registry format");
  }

  return parsed;
}
