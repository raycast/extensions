import { Action, ActionPanel, Icon, Toast, showToast } from "@raycast/api";
import { MutatePromise, showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { createTag, updateObject } from "../../api";
import { useProperties, useTags } from "../../hooks";
import {
  Color,
  Member,
  Property,
  PropertyLinkWithValue,
  PropertyWithValue,
  SpaceObject,
  SpaceObjectWithBody,
  Tag,
  Type,
} from "../../models";
import { propKeys } from "../../utils";

interface TagSubmenuProps {
  spaceId: string;
  object: SpaceObject | SpaceObjectWithBody;
  mutate?: MutatePromise<SpaceObject[] | Type[] | Property[] | Member[]>[];
  mutateObject?: MutatePromise<SpaceObjectWithBody | undefined>;
}

export function TagSubmenu({ spaceId, object, mutate, mutateObject }: TagSubmenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState("");

  // TODO: remove workaround once property retrieval by key is supported -> do:
  // const { property, isLoadingProperty } = useProperty(spaceId, propKeys.tag);
  const { properties, isLoadingProperties } = useProperties(spaceId, undefined, { execute: isOpen });
  const property = properties?.find((p) => p.key === propKeys.tag);

  const { tags, isLoadingTags } = useTags(spaceId, property?.id ?? "", searchText, { execute: isOpen });
  const currentTags =
    (object?.properties as PropertyWithValue[])?.find((p) => p.key === propKeys.tag)?.multi_select || [];

  // Filter out already selected tags from available tags
  const availableTags = (tags || []).filter((tag) => !currentTags.some((t: Tag) => t.id === tag.id));

  async function addTag(tag: Tag) {
    await showToast({ style: Toast.Style.Animated, title: "Adding tag…" });
    try {
      const newTagIds = [...currentTags.map((t: Tag) => t.id), tag.id];

      const propertyUpdate: PropertyLinkWithValue = {
        key: propKeys.tag,
        multi_select: newTagIds,
      };

      await updateObject(spaceId, object.id, {
        properties: [propertyUpdate],
      });

      await showToast({ style: Toast.Style.Success, title: "Tag added" });
      if (mutate) {
        await Promise.all(mutate.map((m) => m()));
      }
      if (mutateObject) {
        await mutateObject();
      }
    } catch (error) {
      await showFailureToast(error, { title: "Failed to add tag" });
    }
  }

  async function removeTag(tag: Tag) {
    await showToast({ style: Toast.Style.Animated, title: "Removing tag…" });
    try {
      const newTagIds = currentTags.filter((t: Tag) => t.id !== tag.id).map((t: Tag) => t.id);

      const propertyUpdate: PropertyLinkWithValue = {
        key: propKeys.tag,
        multi_select: newTagIds,
      };

      await updateObject(spaceId, object.id, {
        properties: [propertyUpdate],
      });

      await showToast({ style: Toast.Style.Success, title: "Tag removed" });
      if (mutate) {
        await Promise.all(mutate.map((m) => m()));
      }
      if (mutateObject) {
        await mutateObject();
      }
    } catch (error) {
      await showFailureToast(error, { title: "Failed to remove tag" });
    }
  }

  async function createAndAddTag(name: string) {
    if (!property?.id) return;

    await showToast({ style: Toast.Style.Animated, title: "Creating tag…" });
    try {
      // Create the new tag with a default color
      const { tag } = await createTag(spaceId, property.id, {
        name,
        color: [Color.Grey, Color.Yellow, Color.Orange, Color.Red, Color.Pink, Color.Purple, Color.Blue][
          Math.floor(Math.random() * 7)
        ],
      });

      // Add the newly created tag to the object
      const newTagIds = [...currentTags.map((t: Tag) => t.id), tag.id];

      const propertyUpdate: PropertyLinkWithValue = {
        key: propKeys.tag,
        multi_select: newTagIds,
      };

      await updateObject(spaceId, object.id, {
        properties: [propertyUpdate],
      });

      await showToast({ style: Toast.Style.Success, title: "Tag created and added" });
      if (mutate) {
        await Promise.all(mutate.map((m) => m()));
      }
      if (mutateObject) {
        await mutateObject();
      }
    } catch (error) {
      await showFailureToast(error, { title: "Failed to create tag" });
    }
  }

  return (
    <>
      <ActionPanel.Submenu
        title="Add Tag"
        icon={Icon.Tag}
        shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
        isLoading={isLoadingProperties || isLoadingTags}
        onOpen={() => {
          setIsOpen(true);
          setSearchText("");
        }}
        onSearchTextChange={setSearchText}
        throttle={true}
      >
        {availableTags.map((tag) => (
          <Action
            key={tag.id}
            title={tag.name}
            icon={{ source: Icon.Tag, tintColor: tag.color }}
            onAction={() => addTag(tag)}
          />
        ))}
        {searchText.trim() && !isLoadingTags ? (
          <Action
            title={`Create tag "${searchText.trim()}"`}
            icon={Icon.Plus}
            onAction={() => createAndAddTag(searchText.trim())}
          />
        ) : (
          <Action
            title="Type to create new tag"
            icon={Icon.Plus}
            onAction={() => showToast({ style: Toast.Style.Failure, title: "Cannot create tag without a name" })}
          />
        )}
      </ActionPanel.Submenu>

      {currentTags.length > 0 && (
        <ActionPanel.Submenu
          title="Remove Tag"
          icon={Icon.Tag}
          shortcut={{ modifiers: ["ctrl", "shift"], key: "t" }}
          isLoading={isLoadingProperties || isLoadingTags}
        >
          {currentTags.map((tag: Tag) => (
            <Action
              key={tag.id}
              title={tag.name}
              icon={{ source: Icon.Tag, tintColor: tag.color }}
              onAction={() => removeTag(tag)}
            />
          ))}
        </ActionPanel.Submenu>
      )}
    </>
  );
}
