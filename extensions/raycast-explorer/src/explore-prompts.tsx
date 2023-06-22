import { ActionPanel, Action, List, Icon, Color, environment, LaunchProps, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";

import { getPrompts, removeUpvote, upvote } from "./api";
import { Prompt, categories as rawCategories } from "./data/prompts";
import { CONTRIBUTE_URL, wrapInCodeBlock } from "./helpers";

type Props = LaunchProps<{ launchContext: string[] }>;

export default function ExplorePrompts(props: Props) {
  const { data, isLoading, mutate } = useCachedPromise(() => getPrompts());

  const [selectedIds, setSelectedIds] = useState<string[]>(props.launchContext ?? []);
  const [selectedCategory, setSelectedCategory] = useState(props.launchContext ? "selected" : "");

  const categories = useMemo(() => {
    const dataNormalizedById =
      data?.data.reduce<Record<string, { upvoted: boolean; upvote_count: number }>>((acc, { id, ...rest }) => {
        return { ...acc, [id]: rest };
      }, {}) ?? {};

    return rawCategories.map((category) => {
      const prompts = category.prompts.map((prompt) => {
        return {
          ...prompt,
          upvoteCount: dataNormalizedById[prompt.id]?.upvote_count ?? 0,
          upvoted: dataNormalizedById[prompt.id]?.upvoted ?? false,
        };
      });

      prompts.sort((a, b) => b.upvoteCount - a.upvoteCount);

      return { ...category, prompts };
    });
  }, [data]);

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

    const protocol = environment.raycastVersion.includes("alpha") ? "raycastinternal://" : "raycast://";

    const queryString = prompts
      .map((selectedPrompt) => {
        const { title, prompt, creativity, icon } = selectedPrompt;

        return `prompts=${encodeURIComponent(JSON.stringify({ title, prompt, creativity, icon }))}`;
      })
      .join("&");

    return `${protocol}prompts/import?${queryString}`;
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

    return categories.filter((category) => category.id === selectedCategory);
  }, [selectedCategory, categories, selectedIds]);

  const selectPromptsTitle = useMemo(() => {
    if (selectedCategory === "popular") {
      return "All Popular Prompts";
    }

    if (selectedCategory === "new") {
      return "New Prompts";
    }

    const category = categories.find((category) => category.id === selectedCategory);
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
      isLoading={isLoading}
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
              return (
                <List.Dropdown.Item key={category.id} title={category.name} icon={category.icon} value={category.id} />
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
            return (
              <List.Item
                key={prompt.id}
                title={prompt.title}
                icon={isSelected ? { source: Icon.CheckCircle, tintColor: Color.Green } : prompt.icon}
                keywords={[category.name, prompt.creativity]}
                accessories={[
                  { icon: Icon.ArrowUp, text: `${prompt.upvoteCount}`, tooltip: `Upvotes: ${prompt.upvoteCount}` },
                  { icon: getCreativityIcon(prompt.creativity), tooltip: `Creativity: ${prompt.creativity}` },
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
                        url={`${CONTRIBUTE_URL}/data/prompts.ts`}
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
        prompt.type === "code" ? prompt.language ?? "sh" : "sh"
      )}\n\n### Output\n\n${wrapInCodeBlock(
        prompt.example.output,
        prompt.type === "code" ? prompt.language ?? "sh" : "sh"
      )}`
    : "";

  let author;
  if (prompt.author) {
    author = prompt.author.link ? `by [${prompt.author.name}](${prompt.author.link})` : prompt.author.name;
  }

  return `## ${prompt.title}\n\n${prompt.prompt.replace(/\{[^{}]+\}/g, "**$&**")}${example ? `\n\n${example}` : ""}${
    author ? `\n\n---\n_${author}_` : ""
  }`;
}

function getCreativityIcon(creativity: Prompt["creativity"]) {
  if (creativity === "none") {
    return Icon.Circle;
  }

  if (creativity === "low") {
    return Icon.CircleProgress25;
  }

  if (creativity === "medium") {
    return Icon.CircleProgress50;
  }

  if (creativity === "high") {
    return Icon.CircleProgress75;
  }

  if (creativity === "maximum") {
    return Icon.CircleProgress100;
  }
}
