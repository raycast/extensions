import { LocalStorage, showToast, Toast } from "@raycast/api";

import { useEffect, useState } from "react";
import { Page } from "../../types";
import { generateShortId } from "../../utils/id";
import { Tag } from "./types";

export function useTag() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTags();
  }, []);

  async function loadTags() {
    try {
      const tagsData = await LocalStorage.getItem<string>("tags");
      const tagsArray = tagsData ? JSON.parse(tagsData) : [];
      setTags(tagsArray);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load tags!",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function createTag(newTag: Omit<Tag, "id">) {
    try {
      if (tags.some((tag) => tag.name === newTag.name)) {
        showToast({
          style: Toast.Style.Failure,
          title: "This tag name is already in use",
        });
        return false;
      }

      const tag: Tag = {
        ...newTag,
        id: generateShortId(),
      };
      const updatedTags = [...tags, tag];
      setTags(updatedTags);
      await LocalStorage.setItem("tags", JSON.stringify(updatedTags));
      showToast({
        style: Toast.Style.Success,
        title: "Tag created successfully!",
      });
      return true;
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to create tag",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      return false;
    }
  }

  async function updateTag(updatedTag: Tag) {
    try {
      const updatedTags = tags.map((tag) => (tag.id === updatedTag.id ? updatedTag : tag));
      setTags(updatedTags);
      await LocalStorage.setItem("tags", JSON.stringify(updatedTags));
      showToast({
        style: Toast.Style.Success,
        title: "Tag updated successfully!",
      });
      return true;
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update tag",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      return false;
    }
  }

  async function deleteTag(id: string) {
    try {
      const updatedTags = tags.filter((tag) => tag.id !== id);
      setTags(updatedTags);
      await LocalStorage.setItem("tags", JSON.stringify(updatedTags));

      const pagesData = await LocalStorage.getItem<string>("pages");
      if (pagesData) {
        const pages: Page[] = JSON.parse(pagesData);
        const updatedPages = pages.map((page) => ({
          ...page,
          tagIds: page.tagIds.filter((tagId) => tagId !== id),
        }));
        await LocalStorage.setItem("pages", JSON.stringify(updatedPages));
      }

      showToast({
        style: Toast.Style.Success,
        title: "Tag deleted successfully!",
      });
      return true;
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete tag",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      return false;
    }
  }

  async function updatePageTags(url: string, newTagIds: string[]) {
    try {
      const pagesData = await LocalStorage.getItem<string>("pages");
      if (!pagesData) return false;

      const pages: Page[] = JSON.parse(pagesData);
      const updatedPages = pages.map((page) => (page.url === url ? { ...page, tagIds: newTagIds } : page));
      await LocalStorage.setItem("pages", JSON.stringify(updatedPages));
      showToast({
        style: Toast.Style.Success,
        title: "Tags updated successfully!",
      });
      return true;
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update tags",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      return false;
    }
  }

  return {
    tags,
    isLoading,
    createTag,
    updateTag,
    deleteTag,
    updatePageTags,
  };
}
