import { useEffect, useState } from "react";
import type { Bookmark, StorageData, Tag, TagGroup } from "../types";
import { LocalStorage } from "@raycast/api";
import { AddBookmarkSchema } from "../types/schemas";
import crypto from "crypto";
import { normalizeTagName } from "../utils/tags";

const STORAGE_KEY = "pockit-data";

const defaultData: StorageData = {
  bookmarks: [],
  tags: [],
  tagGroups: [],
};

export function useStorage() {
  const [data, setData] = useState<StorageData>(defaultData);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      const storedData = await LocalStorage.getItem<string>(STORAGE_KEY);
      if (storedData) {
        const parsed = JSON.parse(storedData);
        // Merge with defaultData to ensure all properties exist (for backward compatibility)
        setData({
          ...defaultData,
          ...parsed,
          bookmarks: parsed.bookmarks || defaultData.bookmarks,
          tags: parsed.tags || defaultData.tags,
          tagGroups: parsed.tagGroups || defaultData.tagGroups,
        });
      }
    } catch (error) {
      console.error("Error loading data from storage:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const saveData = async (newData: StorageData) => {
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    setData(newData);
  };

  /**
   * Gets or creates a tag in LocalStorage
   * @param tagName - The name of the tag to get or create
   * @returns The tag
   */
  const getOrCreateTag = async (tagName: string): Promise<Tag> => {
    const normalizedName = normalizeTagName(tagName);

    if (!normalizedName) {
      throw new Error("Invalid tag name");
    }

    const existing = data.tags.find((tag) => tag.name === normalizedName);
    if (existing) return existing;

    const newTag: Tag = {
      id: crypto.randomUUID(),
      name: normalizedName,
      createdAt: new Date().toISOString(),
    };

    return newTag;
  };

  /**
   * Gets or creates a tag in LocalStorage and saves it if it's new
   * @param tagName - The name of the tag to get or create
   * @returns The tag
   */
  const getOrCreateTagAndSave = async (tagName: string): Promise<Tag> => {
    const tag = await getOrCreateTag(tagName);

    // Check if it's a new tag that needs to be saved
    const existingTagIds = new Set(data.tags.map((t) => t.id));
    if (!existingTagIds.has(tag.id)) {
      const newData = {
        ...data,
        tags: [...data.tags, tag],
      };
      await saveData(newData);
    }

    return tag;
  };

  /**
   * Adds a tag group to LocalStorage
   * @param tagGroup - The tag group to add
   */
  const addTagGroup = async (tagGroup: Omit<TagGroup, "id" | "createdAt">) => {
    const newTagGroup: TagGroup = {
      ...tagGroup,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    const newData = {
      ...data,
      tagGroups: [...data.tagGroups, newTagGroup],
    };

    await saveData(newData);
  };

  /**
   * Updates a tag group in LocalStorage
   * @param groupId - The ID of the tag group to update
   * @param updates - The updates to apply to the tag group
   */
  const updateTagGroup = async (groupId: string, updates: Partial<TagGroup>) => {
    const newData = {
      ...data,
      tagGroups: data.tagGroups.map((g) => (g.id === groupId ? { ...g, ...updates } : g)),
    };
    await saveData(newData);
  };

  /**
   * Deletes a tag group from LocalStorage
   * @param groupId - The ID of the tag group to delete
   */
  const deleteTagGroup = async (groupId: string) => {
    const newData = {
      ...data,
      tagGroups: data.tagGroups.filter((g) => g.id !== groupId),
      // Remove groupId from tags in this group
      tags: data.tags.map((tag) => (tag.groupId === groupId ? { ...tag, groupId: undefined } : tag)),
    };
    await saveData(newData);
  };

  /**
   * Gets the tags by group
   * @returns A map of group IDs to tags
   */
  const getTagsByGroup = (): Map<string | undefined, Tag[]> => {
    const grouped = new Map<string | undefined, Tag[]>();

    data.tags.forEach((tag) => {
      const groupId = tag.groupId || undefined;
      if (!grouped.has(groupId)) {
        grouped.set(groupId, []);
      }
      grouped.get(groupId)!.push(tag);
    });

    return grouped;
  };

  /**
   * Gets the group for a tag
   * @param tagId - The ID of the tag to get the group for
   * @returns The group for the tag
   */
  const getGroupForTag = (tagId: string): TagGroup | undefined => {
    const tag = data.tags.find((t) => t.id === tagId);
    if (!tag || !tag.groupId) return undefined;
    return data.tagGroups.find((g) => g.id === tag.groupId);
  };

  /**
   * Adds a bookmark to LocalStorage
   * @param bookmarkData - The bookmark data to add
   */
  const addBookmark = async (bookmarkData: AddBookmarkSchema) => {
    const tagPromises = bookmarkData.tags.map((tag) => getOrCreateTag(tag));
    const tags = await Promise.all(tagPromises);

    const existingTagIds = new Set(data.tags.map((tag) => tag.id));
    const newTags = tags.filter((tag) => !existingTagIds.has(tag.id));
    const updatedTags = [...data.tags, ...newTags];

    const newBookmark: Bookmark = {
      ...bookmarkData,
      id: crypto.randomUUID(),
      tagIds: tags.map((tag) => tag.id),
      createdAt: new Date().toISOString(),
    };

    const newData = {
      ...data,
      bookmarks: [...data.bookmarks, newBookmark],
      tags: updatedTags,
    };

    await saveData(newData);
  };

  /**
   * Adds a tag to LocalStorage
   * @param tag - The tag to add
   */
  const addTag = async (tag: Omit<Tag, "id" | "createdAt">) => {
    const newTag: Tag = {
      id: crypto.randomUUID(),
      ...tag,
      createdAt: new Date().toISOString(),
    };

    const newData = {
      ...data,
      tags: [...data.tags, newTag],
    };

    await saveData(newData);
  };

  /**
   * Deletes a tag from LocalStorage and removes it from all bookmarks that have it assigned
   * @param id - The ID of the tag to delete
   */
  const deleteTag = async (id: string) => {
    const newData = {
      ...data,
      bookmarks: data.bookmarks.map((bookmark) => ({
        ...bookmark,
        tagIds: bookmark.tagIds.filter((tagId) => tagId !== id),
      })),
      tags: data.tags.filter((tag) => tag.id !== id),
    };

    await saveData(newData);
  };

  /**
   * Updates a tag's metadata in LocalStorage
   * @param id - The ID of the tag to update
   * @param updates - The updates to apply to the tag
   */
  const updateTag = async (id: string, updates: Partial<Tag>) => {
    const newData = {
      ...data,
      tags: data.tags.map((tag) => (tag.id === id ? { ...tag, ...updates } : tag)),
    };

    await saveData(newData);
  };

  /**
   * Merges multiple tags into a single tag
   * @param tagIdsToMerge - The IDs of the tags to merge
   * @param targetTagId - The ID of the target tag to merge into
   */
  const mergeTags = async (tagIdsToMerge: string[], targetTagId: string) => {
    const newData = {
      ...data,
      tags: data.tags.filter((tag) => !tagIdsToMerge.includes(tag.id) || tag.id === targetTagId),
      bookmarks: data.bookmarks.map((bookmark) => {
        const hasAnyMergedTag = bookmark.tagIds.some((tagId) => tagIdsToMerge.includes(tagId));
        if (!hasAnyMergedTag) return bookmark;

        const filteredTagIds = bookmark.tagIds.filter((tagId) => !tagIdsToMerge.includes(tagId));
        return {
          ...bookmark,
          tagIds: [...filteredTagIds, targetTagId],
        };
      }),
    };

    await saveData(newData);
  };

  /**
   * Gets the stats for all tags, including the number of bookmarks assigned to each tag
   * @returns A map of tag IDs to their stats
   */
  const getTagStats = (): Map<string, { count: number; tag: Tag }> => {
    const stats = new Map<string, { count: number; tag: Tag }>();

    data.tags.forEach((tag) => {
      const count = data.bookmarks.filter((bookmark) => bookmark.tagIds.includes(tag.id)).length;
      stats.set(tag.id, { count, tag });
    });

    return stats;
  };

  /**
   * Gets the tags for a bookmark
   * @param bookmark - The bookmark to get the tags for
   * @returns The tags for the bookmark
   */
  const getTagsForBookmark = (bookmark: Bookmark): Tag[] => {
    return bookmark.tagIds
      .map((tagId) => data.tags.find((tag) => tag.id === tagId))
      .filter((tag): tag is Tag => tag !== undefined);
  };

  /**
   * Cleans up unused tags from LocalStorage
   */
  const cleanupUnusedTags = async () => {
    const usedTagIds = new Set(data.bookmarks.flatMap((bookmark) => bookmark.tagIds));
    const newData = {
      ...data,
      tags: data.tags.filter((tag) => usedTagIds.has(tag.id)),
    };

    await saveData(newData);
  };

  /**
   * Updates a bookmark in LocalStorage
   * @param id - The ID of the bookmark to update
   * @param updates - The updates to apply to the bookmark
   */
  const updateBookmark = async (id: string, updates: Partial<Bookmark>) => {
    // Normal update with tag IDs
    const newData = {
      ...data,
      bookmarks: data.bookmarks.map((bookmark) => (bookmark.id === id ? { ...bookmark, ...updates } : bookmark)),
    };

    await saveData(newData);
  };

  const deleteBookmark = async (id: string) => {
    const newData = {
      ...data,
      bookmarks: data.bookmarks.filter((bookmark) => bookmark.id !== id),
    };

    await saveData(newData);
  };

  return {
    data,
    isLoading,
    addBookmark,
    addTag,
    deleteTag,
    updateTag,
    mergeTags,
    getTagStats,
    getTagsForBookmark,
    cleanupUnusedTags,
    updateBookmark,
    deleteBookmark,
    addTagGroup,
    updateTagGroup,
    deleteTagGroup,
    getTagsByGroup,
    getGroupForTag,
    getOrCreateTagAndSave,
    reloadData: loadData,
  };
}
