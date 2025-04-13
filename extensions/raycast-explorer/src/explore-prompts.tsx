import { ActionPanel, Action, List, Icon, Color, environment, LaunchProps, showToast, Toast } from "@raycast/api";
import { useCachedPromise, useFetch } from "@raycast/utils";
import { useMemo, useState } from "react";

import { getPromptUpvotes, removeUpvote, upvote } from "./api";
import { Prompt, PromptCategory } from "./data/prompts";
import { CONTRIBUTE_URL, getIcon, raycastProtocol, wrapInCodeBlock } from "./helpers";

type Props = LaunchProps<{ launchContext: string[] }>;

export default function ExplorePrompts(props: Props) {
  const { data: rawCategories, isLoading } = useFetch<PromptCategory[]>(`https://ray.so/api/prompts`);
  const { data: promptUpvotes, isLoading: isLoadingpromptUpvotes, mutate } = useCachedPromise(() => getPromptUpvotes());

  const [selectedIds, setSelectedIds] = useState<string[]>(props.launchContext ?? []);
  const [selectedCategory, setSelectedCategory] = useState(props.launchContext ? "selected" : "");

  const categories = useMemo(() => {
    const dataNormalizedById =
      promptUpvotes?.data.reduce<Record<string, { upvoted: boolean; upvote_count: number }>>((acc, { id, ...rest }) => {
        return { ...acc, [id]: rest };
      }, {}) ?? {};

    return (
      rawCategories?.map((category) => {
        const prompts = category.prompts.map((prompt) => {
          return {
            ...prompt,
            upvoteCount: dataNormalizedById[prompt.id]?.upvote_count ?? 0,
            upvoted: dataNormalizedById[prompt.id]?.upvoted ?? false,
          };
        });

        prompts.sort((a, b) => b.upvoteCount - a.upvoteCount);

        return { ...category, prompts };
      }) ?? []
    );
  }, [promptUpvotes, rawCategories]);

  function toggleSelect(id: string) {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  }

  async function upvotePrompt(prompt: Prompt) {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Upvoting prompt" });
      await upvote(prompt);
      await mutate();
      await showToast({ style: Toast.Style.Success, title: "Upvoted prompt" });
    } catch (error) {
      if (error instanceof Error && error.message.includes("422")) {
        await showToast({ style: Toast.Style.Failure, title: "You've already upvoted this prompt" });
      } else {
        await showToast({ style: Toast.Style.Failure, title: "Failed to upvote prompt" });
      }
    }
  }

  async function removePromptUpvote(prompt: Prompt) {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Removing upvote" });
      await removeUpvote(prompt);
      await mutate();
      await showToast({ style: Toast.Style.Success, title: "Remove upvote" });
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to remove upvote" });
    }
  }

  const addToRaycastUrl = useMemo(() => {
    const prompts = categories
      .flatMap((category) => category.prompts)
      .filter((prompt) => selectedIds.includes(prompt.id));

    const queryString = prompts
      .map((selectedPrompt) => {
        const { title, prompt, creativity, icon, model } = selectedPrompt;

        return `prompts=${encodeURIComponent(
          JSON.stringify({ title, prompt, creativity, icon, model: prepareModel(model) }),
        )}`;
      })
      .join("&");

    return `${raycastProtocol}prompts/import?${queryString}`;
  }, [selectedIds, categories]);

  const sharingLink = useMemo(() => {
    const prompts = categories
      .flatMap((category) => category.prompts)
      .filter((prompt) => selectedIds.includes(prompt.id));

    const { extensionName, commandName, raycastVersion } = environment;
    const protocol = raycastVersion.includes("alpha") ? "raycastinternal://" : "raycast://";
    const baseLink = `${protocol}extensions/thomaslombart/${extensionName}/${commandName}`;

    return `${baseLink}?launchContext=${encodeURIComponent(JSON.stringify(prompts.map((prompt) => prompt.id)))}`;
  }, [selectedIds, categories]);

  const filteredCategories = useMemo(() => {
    if (selectedCategory === "") {
      return categories;
    }

    if (selectedCategory === "selected") {
      return categories.map((category) => {
        return {
          ...category,
          prompts: category.prompts.filter((prompt) => selectedIds.includes(prompt.id)),
        };
      });
    }

    if (selectedCategory === "popular") {
      const first20Upvotedprompts = categories
        .flatMap((category) => category.prompts)
        .filter((prompt) => prompt.upvoteCount > 0)
        .sort((a, b) => b.upvoteCount - a.upvoteCount)
        .slice(0, 20);

      return [
        {
          name: "Popular Prompts",
          id: "popular",
          icon: Icon.ArrowUp,
          prompts: first20Upvotedprompts,
        },
      ];
    }

    if (selectedCategory === "new") {
      const prompts = categories.flatMap((category) => category.prompts);
      // return prompts that have been published in the last 2 weeks
      const newPrompts = prompts
        .filter((prompt) => {
          const twoWeeksAgo = new Date();
          twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
          return new Date(prompt.date) >= twoWeeksAgo;
        })
        .sort((a, b) => {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

      return [
        {
          name: "New Prompts",
          id: "new",
          icon: Icon.Calendar,
          prompts: newPrompts,
        },
      ];
    }

    return categories.filter((category) => category.slug === selectedCategory);
  }, [selectedCategory, categories, selectedIds]);

  const selectPromptsTitle = useMemo(() => {
    if (selectedCategory === "popular") {
      return "All Popular Prompts";
    }

    if (selectedCategory === "new") {
      return "New Prompts";
    }

    const category = categories.find((category) => category.slug === selectedCategory);
    if (category) {
      return `All ${category.name} Prompts`;
    }

    return "All Prompts";
  }, [selectedCategory, categories]);

  const filteredPromptIds = filteredCategories.flatMap((category) => category.prompts).map((prompt) => prompt.id);
  const selectedFilteredPromptsCount = selectedIds.filter((id) => filteredPromptIds.includes(id)).length;
  const showSelectAllPromptsAction = selectedFilteredPromptsCount !== filteredPromptIds.length;
  const hasSelectedPrompts = selectedIds.length > 0;

  return (
    <List
      isShowingDetail
      isLoading={isLoadingpromptUpvotes || isLoading}
      searchBarPlaceholder="Filter by title, category, or creativity"
      searchBarAccessory={
        <List.Dropdown tooltip="Select Category" onChange={setSelectedCategory} value={selectedCategory}>
          <List.Dropdown.Item icon={Icon.BulletPoints} title="All Categories" value="" />
          {hasSelectedPrompts ? (
            <List.Dropdown.Item icon={Icon.CheckCircle} title="Selected Prompts" value="selected" />
          ) : null}
          <List.Dropdown.Item icon={Icon.ArrowUp} title="Popular Prompts" value="popular" />
          <List.Dropdown.Item icon={Icon.Calendar} title="New Prompts" value="new" />

          <List.Dropdown.Section title="Categories">
            {categories.map((category) => {
              const icon = getIcon(category.icon || "");
              return (
                <List.Dropdown.Item
                  key={category.slug}
                  title={category.name}
                  icon={Icon[icon] ?? Icon.List}
                  value={category.slug}
                />
              );
            })}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {filteredCategories.map((category) => (
        <List.Section key={category.name} title={category.name}>
          {category.prompts.map((prompt) => {
            const isSelected = selectedIds.includes(prompt.id);
            const icon = getIcon(category.icon || "");
            return (
              <List.Item
                key={prompt.id}
                title={prompt.title}
                icon={isSelected ? { source: Icon.CheckCircle, tintColor: Color.Green } : (Icon[icon] ?? Icon.List)}
                keywords={[category.name, prompt.creativity || "unspecified"]}
                accessories={[
                  { icon: Icon.ArrowUp, text: `${prompt.upvoteCount}`, tooltip: `Upvotes: ${prompt.upvoteCount}` },
                  {
                    icon: getCreativityIcon(prompt.creativity),
                    tooltip: `Creativity: ${prompt.creativity || "Not specified"}`,
                  },
                ]}
                detail={<List.Item.Detail markdown={getPromptMarkdown(prompt)} />}
                actions={
                  <ActionPanel>
                    {isSelected ? (
                      <Action title="Unselect Prompt" icon={Icon.Circle} onAction={() => toggleSelect(prompt.id)} />
                    ) : (
                      <Action title="Select Prompt" icon={Icon.CheckCircle} onAction={() => toggleSelect(prompt.id)} />
                    )}
                    {hasSelectedPrompts ? (
                      <Action.Open title="Add to Raycast" icon={Icon.RaycastLogoNeg} target={addToRaycastUrl} />
                    ) : null}

                    {hasSelectedPrompts ? (
                      <Action.CopyToClipboard
                        title="Copy URL to Share"
                        shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                        icon={Icon.Link}
                        content={sharingLink}
                      />
                    ) : null}
                    <ActionPanel.Section>
                      {prompt.upvoted ? (
                        <Action
                          title="Remove Upvote"
                          shortcut={{ modifiers: ["ctrl", "shift"], key: "u" }}
                          icon={Icon.Minus}
                          onAction={() => removePromptUpvote(prompt)}
                        />
                      ) : (
                        <Action
                          title="Upvote Prompt"
                          shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
                          icon={Icon.ArrowUp}
                          onAction={() => upvotePrompt(prompt)}
                        />
                      )}
                      {showSelectAllPromptsAction ? (
                        <Action
                          title={`Select ${selectPromptsTitle}`}
                          icon={Icon.CheckCircle}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                          onAction={() =>
                            setSelectedIds((ids) => [
                              ...ids.filter((id) => !filteredPromptIds.includes(id)),
                              ...filteredPromptIds,
                            ])
                          }
                        />
                      ) : null}
                      {hasSelectedPrompts ? (
                        <Action
                          title={`Unselect ${selectPromptsTitle}`}
                          icon={Icon.Circle}
                          shortcut={{ modifiers: ["opt", "shift"], key: "a" }}
                          onAction={() => {
                            setSelectedIds(selectedIds.filter((id) => !filteredPromptIds.includes(id)));
                          }}
                        />
                      ) : null}
                      <Action.OpenInBrowser
                        title="Contribute"
                        icon={Icon.PlusSquare}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                        url={CONTRIBUTE_URL}
                      />
                    </ActionPanel.Section>

                    <ActionPanel.Section>
                      <Action.CopyToClipboard
                        title="Copy Prompt"
                        shortcut={{ modifiers: ["cmd"], key: "." }}
                        content={prompt.prompt}
                      />

                      {prompt.example ? (
                        <Action.CopyToClipboard
                          title="Copy Example Selection"
                          shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                          content={prompt.example.selection}
                        />
                      ) : null}
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}

function getPromptMarkdown(prompt: Prompt) {
  const example = prompt.example
    ? `## Example\n\n${
        prompt.example.argument ? `### Argument\n\n${prompt.example.argument}\n\n` : ""
      }### Selection\n\n${wrapInCodeBlock(
        prompt.example.selection,
        prompt.type === "code" ? (prompt.language ?? "sh") : "sh",
      )}\n\n### Output\n\n${wrapInCodeBlock(
        prompt.example.output,
        prompt.type === "code" ? (prompt.language ?? "sh") : "sh",
      )}`
    : "";

  let author;
  if (prompt.author) {
    author = prompt.author.link ? `by [${prompt.author.name}](${prompt.author.link})` : prompt.author.name;
  }

  const formattedPrompt = prompt.prompt
    .split(/(@[a-zA-Z0-9-]+\{id=[^}]+\})/)
    .map((part) => {
      const match = part.match(/@([a-zA-Z0-9-]+)\{id=([^}]+)\}/);
      if (match) {
        // Format extension references as inline code
        return `\`@${match[1]}\``;
      }
      // Keep existing placeholder highlighting
      return part.replace(/\{[^{}]+\}/g, "**$&**");
    })
    .join("");

  return `## ${prompt.title}\n\n${formattedPrompt}${example ? `\n\n${example}` : ""}${
    author ? `\n\n---\n_${author}_` : ""
  }`;
}

function getCreativityIcon(creativity: Prompt["creativity"]) {
  if (!creativity || creativity === "none") {
    return Icon.CircleDisabled;
  }

  if (creativity === "low") {
    return Icon.StackedBars1;
  }

  if (creativity === "medium") {
    return Icon.StackedBars2;
  }

  if (creativity === "high") {
    return Icon.StackedBars3;
  }

  if (creativity === "maximum") {
    return Icon.StackedBars4;
  }
}

function prepareModel(model?: string) {
  if (model && /^".*"$/.test(model)) {
    return model.slice(1, model.length - 1);
  }
  return model || "openai_gpt35_turbo";
}
