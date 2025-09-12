import { ActionPanel, Action, List, Detail, Icon, Color } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { data, isLoading } = useFetch(
    `https://impulse.directory/api/public/search-prompts?search=${encodeURIComponent(searchText.length === 0 ? "" : searchText)}`,
    {
      parseResponse: parseFetchResponse,
      onError: (error) => {
        console.error("Fetch error:", error);
      },
    },
  );
  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} searchBarPlaceholder="Search prompts..." throttle>
      <List.Section title="Prompt Results" subtitle={`${data?.length || 0} prompts found`}>
        {data?.map((searchResult: SearchResult) => (
          <SearchListItem key={searchResult.id} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "coding":
        return { source: Icon.Code, tintColor: Color.Blue };
      case "writing":
        return { source: Icon.Document, tintColor: Color.Green };
      case "design":
        return { source: Icon.Brush, tintColor: Color.Purple };
      case "marketing":
        return { source: Icon.Megaphone, tintColor: Color.Orange };
      default:
        return { source: Icon.LightBulb, tintColor: Color.Yellow };
    }
  };

  return (
    <List.Item
      icon={getCategoryIcon(searchResult.category)}
      title={searchResult.name}
      subtitle={searchResult.description}
      accessories={[
        { tag: { value: searchResult.category, color: Color.Blue } },
        { text: `${searchResult.tags.length} tags` },
        { date: new Date(searchResult.createdAt) },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Actions">
            <Action.Push
              title="View Prompt Details"
              icon={Icon.Eye}
              target={<PromptDetail searchResult={searchResult} />}
            />
            <Action.CopyToClipboard
              title="Copy Prompt Content"
              icon={Icon.Clipboard}
              content={searchResult.content}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function PromptDetail({ searchResult }: { searchResult: SearchResult }) {
  const getCategoryEmoji = (category: string) => {
    switch (category.toLowerCase()) {
      case "coding":
        return "💻";
      case "writing":
        return "✍️";
      case "design":
        return "🎨";
      case "marketing":
        return "📢";
      default:
        return "💡";
    }
  };

  const markdown = `# ${getCategoryEmoji(searchResult.category)} ${searchResult.name}

> **${searchResult.category}** • Created ${new Date(searchResult.createdAt).toLocaleDateString()}

## 🏷️ Tags
${searchResult.tags.map((tag) => `\`${tag}\``).join(" ")}

---

## 📝 Prompt Content

\`\`\`
${searchResult.content}
\`\`\`

---

### 🔧 Usage
- Press **⌘C** to copy the full prompt content
- Press **⌘T** to copy just the title
- Press **⌘⇧C** to copy as formatted markdown
- Use this prompt in your favorite AI tool`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Category" text={searchResult.category} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Created" text={new Date(searchResult.createdAt).toLocaleDateString()} />
          <Detail.Metadata.Label title="Tags Count" text={searchResult.tags.length.toString()} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Tags">
            {searchResult.tags.map((tag) => (
              <Detail.Metadata.TagList.Item key={tag} text={tag} color={Color.Blue} />
            ))}
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Prompt Content"
              icon={Icon.Clipboard}
              content={searchResult.content}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Prompt Title"
              icon={Icon.Text}
              content={searchResult.name}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
            />
            <Action.CopyToClipboard
              title="Copy as Markdown"
              icon={Icon.Document}
              content={`# ${searchResult.name}\n\n${searchResult.content}`}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

async function parseFetchResponse(response: Response) {
  const text = await response.text();

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`JSON parse error. Raw response: ${text.substring(0, 200)}`);
  }

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  if (json.prompts && Array.isArray(json.prompts)) {
    return json.prompts.map(
      (prompt: {
        id: string;
        title: string;
        content: string;
        category: { name: string };
        promptTags: { tag: { name: string } }[];
        createdAt: string;
      }) => ({
        id: prompt.id,
        name: prompt.title || "Unknown Prompt",
        description: prompt.content?.substring(0, 100) + "..." || "",
        content: prompt.content || "",
        category: prompt.category?.name || "",
        tags: prompt.promptTags?.map((tag: { tag: { name: string } }) => tag.tag.name) || [],
        createdAt: prompt.createdAt || "",
      }),
    );
  }

  return [];
}

interface SearchResult {
  id: string;
  name: string;
  description: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: string;
}
