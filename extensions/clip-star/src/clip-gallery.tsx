import { Grid, ActionPanel, Action, showToast, Toast, useNavigation, Icon, List } from "@raycast/api";
import { useState, useEffect } from "react";
import { deleteClip, getClips, updateClip } from "./utils/storage";
import { Clip } from "./types";
import { EditClipForm } from "./edit-clip";
import { getLocalizedStrings } from "./utils/i18n";

function getScreenshotUrl(url: string) {
  return `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url`;
}

function ClipCard({
  clips,
  clip,
  onEdit,
  onDelete,
  strings,
}: {
  clips: Clip[];
  clip: Clip;
  onEdit: () => void;
  onDelete: () => void;
  strings: ReturnType<typeof getLocalizedStrings>;
}) {
  return (
    <Grid.Item
      key={clip.id}
      content={{
        value: {
          source: clip.coverImage ?? getScreenshotUrl(clip.url),
          fallback: Icon.EmojiSad,
        },
        tooltip: "",
      }}
      title={clip.title}
      subtitle={clip.tags.join(", ")}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={clip.url} />
          <Action
            title={strings.edit}
            icon={Icon.Pencil}
            onAction={onEdit}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
          />
          <Action
            title={strings.delete}
            icon={Icon.Trash}
            onAction={onDelete}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
          />
          <Action.CopyToClipboard content={JSON.stringify(clips)} title={strings.copyAllClips} />
        </ActionPanel>
      }
    />
  );
}

function customSearch(clip: Clip, searchText: string): boolean {
  const searchLower = searchText.toLowerCase();
  const titleLower = clip.title.toLowerCase();
  const urlLower = clip.url.toLowerCase();
  const tagsLower = clip.tags.map((tag) => tag.toLowerCase());

  // 检查完整匹配
  if (
    titleLower.includes(searchLower) ||
    urlLower.includes(searchLower) ||
    tagsLower.some((tag) => tag.includes(searchLower))
  ) {
    return true;
  }

  // 检查首字母缩写匹配
  const titleWords = titleLower.split(/\s+/);
  const titleAcronym = titleWords.map((word) => word[0]).join("");
  if (titleAcronym.includes(searchLower)) {
    return true;
  }

  // 检查连续子序列匹配
  const isSubsequence = (str: string, sub: string) => {
    let j = 0;
    for (let i = 0; i < str.length && j < sub.length; i++) {
      if (str[i] === sub[j]) j++;
    }
    return j === sub.length;
  };

  if (isSubsequence(titleLower, searchLower) || isSubsequence(urlLower, searchLower)) {
    return true;
  }

  return false;
}

export default function ClipGallery({ initialFilterUrl }: { initialFilterUrl?: string }) {
  const [clips, setClips] = useState<Clip[]>([]);
  const [filteredClips, setFilteredClips] = useState<Clip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [searchText, setSearchText] = useState(initialFilterUrl || "");
  const { push } = useNavigation();

  const strings = getLocalizedStrings();

  useEffect(() => {
    fetchClips();
  }, []);

  useEffect(() => {
    let filtered = clips;
    if (selectedTag && selectedTag !== "all") {
      filtered = filtered.filter((clip) => clip.tags.includes(selectedTag));
    }
    if (searchText) {
      filtered = filtered.filter((clip) => customSearch(clip, searchText));
    }
    setFilteredClips(filtered);
  }, [selectedTag, searchText, clips]);

  async function fetchClips() {
    try {
      setIsLoading(true);
      const fetchedClips = await getClips();
      setClips(fetchedClips);
      setFilteredClips(fetchedClips);
    } catch (error) {
      showToast(Toast.Style.Failure, strings.failedToLoadClips);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      setIsLoading(true);
      await deleteClip(id);
      setFilteredClips((prevClips) => prevClips.filter((clip) => clip.id !== id));
      showToast(Toast.Style.Success, strings.clipDeleted);
    } catch (error) {
      showToast(Toast.Style.Failure, strings.failedToDeleteClip);
    } finally {
      setIsLoading(false);
    }
  }

  function handleEdit(clip: Clip) {
    push(
      <EditClipForm
        clip={clip}
        onEdit={async (updatedClip) => {
          setIsLoading(true);
          await updateClip(updatedClip);
          setFilteredClips((prevClips) => prevClips.map((clip) => (clip.id === updatedClip.id ? updatedClip : clip)));
          showToast(Toast.Style.Success, strings.clipUpdated);
          setIsLoading(false);
        }}
      />,
    );
  }

  function getAllTags() {
    const tagSet = new Set<string>();
    clips.forEach((clip) => {
      clip.tags.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet);
  }

  return (
    <Grid
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setSearchText}
      columns={3}
      aspectRatio="3/2"
      fit={Grid.Fit.Fill}
      navigationTitle={strings.clips}
      searchText={searchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip={strings.filterByTag}
          value={selectedTag}
          onChange={(newValue) => {
            setSelectedTag(newValue);
          }}
        >
          <List.Dropdown.Item title={strings.allTags} value="all" />
          {getAllTags().map((tag) => (
            <List.Dropdown.Item key={tag} title={tag} value={tag} />
          ))}
        </List.Dropdown>
      }
    >
      {filteredClips.map((clip) => (
        <ClipCard
          clips={clips}
          key={clip.id}
          clip={clip}
          onEdit={() => handleEdit(clip)}
          onDelete={() => handleDelete(clip.id)}
          strings={strings}
        />
      ))}
    </Grid>
  );
}
