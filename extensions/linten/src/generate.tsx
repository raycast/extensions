import { useState, useEffect, useMemo } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  Clipboard,
  Detail,
  useNavigation,
} from "@raycast/api";
import { LINTEN_CLOUD_BASE, isValidUrlInput } from "./api";
import {
  CloudTemplate,
  fetchCloudTemplates,
  personalizeTemplate,
} from "./templates";

function cleanDomain(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .trim();
}

function isDomainLike(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return (
    trimmed.includes(".") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("localhost")
  );
}

function FullManifestView({
  template,
  domain,
  content,
}: {
  template: CloudTemplate;
  domain: string;
  content: string;
}) {
  const { pop } = useNavigation();
  const hasCustomDomain = domain !== "acme.com";

  const markdown = [
    hasCustomDomain
      ? `# ${template.name} for \`${domain}\``
      : `# ${template.name}`,
    "",
    `*Category*: **${template.category}** | *Specification*: **Spec v2** | *Cloud Scaffolder*: **Linten**`,
    "",
    `> ${template.description}`,
    "",
    "```markdown",
    content,
    "```",
  ].join("\n");

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Manifest to Clipboard"
            icon={Icon.Clipboard}
            content={content}
          />
          <Action.OpenInBrowser
            title="Open in Linten Cloud Scaffolder"
            icon={Icon.Globe}
            url={
              hasCustomDomain
                ? `${LINTEN_CLOUD_BASE}/?url=${encodeURIComponent(domain)}`
                : LINTEN_CLOUD_BASE
            }
          />
          <Action
            title="Back to Templates"
            icon={Icon.ArrowLeft}
            shortcut={{ modifiers: ["cmd"], key: "backspace" }}
            onAction={pop}
          />
        </ActionPanel>
      }
    />
  );
}

export default function GenerateCommand() {
  const [templates, setTemplates] = useState<CloudTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [clipboardDomain, setClipboardDomain] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [cloudTemplates, clipText] = await Promise.all([
          fetchCloudTemplates(),
          Clipboard.readText().catch(() => ""),
        ]);
        setTemplates(cloudTemplates);
        if (clipText && isValidUrlInput(clipText.trim())) {
          setClipboardDomain(cleanDomain(clipText.trim()));
        }
      } catch {
        // Handled gracefully by fetchCloudTemplates
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const trimmedSearch = searchText.trim();
  const isTyping = trimmedSearch.length > 0;
  const isDomainInput = isTyping && isDomainLike(trimmedSearch);
  const cleanedTypedDomain = isDomainInput ? cleanDomain(trimmedSearch) : "";
  const isValidTypedDomain =
    isDomainInput &&
    cleanedTypedDomain.length > 0 &&
    (isValidUrlInput(trimmedSearch) || isValidUrlInput(cleanedTypedDomain));

  // Determine active target domain
  const activeDomain = useMemo(() => {
    if (isValidTypedDomain) {
      return cleanedTypedDomain;
    }
    if (clipboardDomain) {
      return clipboardDomain;
    }
    return "acme.com";
  }, [isValidTypedDomain, cleanedTypedDomain, clipboardDomain]);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    templates.forEach((t) => set.add(t.category));
    return Array.from(set);
  }, [templates]);

  // Filter templates:
  // If user entered an invalid domain, return empty list to trigger the invalid domain EmptyView.
  // If user typed a valid domain, show all templates personalized for that domain.
  // If user typed search keywords, filter templates by keyword match.
  const filteredTemplates = useMemo(() => {
    if (isDomainInput && !isValidTypedDomain) {
      return [];
    }

    const query = trimmedSearch.toLowerCase();

    return templates.filter((t) => {
      // Category filter
      if (selectedCategory !== "all" && t.category !== selectedCategory) {
        return false;
      }

      // If user typed a valid domain, show all templates for that domain
      if (isValidTypedDomain || !query) {
        return true;
      }

      // Keyword text matching
      return (
        t.name.toLowerCase().includes(query) ||
        t.id.toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query)
      );
    });
  }, [
    templates,
    trimmedSearch,
    selectedCategory,
    isDomainInput,
    isValidTypedDomain,
  ]);

  return (
    <List
      isLoading={loading}
      isShowingDetail={true}
      searchBarPlaceholder="Search templates or type product domain (e.g. example.com)..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Industry Category"
          value={selectedCategory}
          onChange={setSelectedCategory}
        >
          <List.Dropdown.Item
            title={`All Industries (${templates.length} Templates)`}
            value="all"
          />
          {categories.map((cat) => (
            <List.Dropdown.Item key={cat} title={cat} value={cat} />
          ))}
        </List.Dropdown>
      }
    >
      {isDomainInput && !isValidTypedDomain ? (
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="Invalid Domain or URL"
          description={`"${trimmedSearch}" is not a valid domain. Enter a valid domain (e.g. example.com) or search by keyword.`}
        />
      ) : (
        <List.EmptyView
          icon={Icon.Document}
          title="No matching templates found"
          description="Try searching for another industry keyword or clear the search filter."
        />
      )}
      {filteredTemplates.map((template) => {
        const personalized = personalizeTemplate(
          template.content,
          activeDomain,
        );
        const charCount = personalized.length;
        const estTokens = Math.round(charCount / 4);

        const detailMarkdown = [
          `# ${template.name}`,
          "",
          `> ${template.description}`,
          "",
          ...(activeDomain !== "acme.com"
            ? [`**Target Domain**: \`${activeDomain}\``, ""]
            : []),
          "```markdown",
          personalized,
          "```",
        ].join("\n");

        return (
          <List.Item
            key={template.id}
            id={template.id}
            icon={{ source: Icon.Document, tintColor: Color.Blue }}
            title={template.name}
            subtitle={activeDomain !== "acme.com" ? activeDomain : undefined}
            accessories={[
              { tag: { value: template.category, color: Color.SecondaryText } },
            ]}
            detail={
              <List.Item.Detail
                markdown={detailMarkdown}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Template ID"
                      text={template.id}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Industry Category"
                      text={template.category}
                    />
                    {activeDomain !== "acme.com" && (
                      <List.Item.Detail.Metadata.Label
                        title="Active Target Domain"
                        text={activeDomain}
                      />
                    )}
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Character Count"
                      text={`${charCount} chars`}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Estimated Tokens"
                      text={`~${estTokens} tokens`}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Cloud Source"
                      text="Linten Cloud"
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Manifest (llms.txt)"
                  icon={Icon.Clipboard}
                  content={personalized}
                />
                <Action.Push
                  title="View Full Manifest"
                  icon={Icon.Eye}
                  target={
                    <FullManifestView
                      template={template}
                      domain={activeDomain}
                      content={personalized}
                    />
                  }
                />
                <Action.OpenInBrowser
                  title="Open in Linten Cloud Scaffolder"
                  icon={Icon.Globe}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                  url={`${LINTEN_CLOUD_BASE}/?url=${encodeURIComponent(activeDomain)}`}
                />
                {clipboardDomain && activeDomain !== clipboardDomain && (
                  <Action
                    title={`Switch Target to Clipboard (${clipboardDomain})`}
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={() => setSearchText(clipboardDomain)}
                  />
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
