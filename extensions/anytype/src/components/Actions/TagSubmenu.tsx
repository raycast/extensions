import { Action, ActionPanel, Icon, Toast, showToast } from "@raycast/api";
import { MutatePromise, showFailureToast } from "@raycast/utils";
import { partition } from "lodash";
import { useState } from "react";
import { updateObject } from "../../api";
import { useProperties, useTags } from "../../hooks";
import {
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

  // TODO: remove workaround once property retrieval by key is supported -> do:
  // const { property, isLoadingProperty } = useProperty(spaceId, propKeys.tag);
  const { properties, isLoadingProperties } = useProperties(spaceId);
  const property = properties?.find((p) => p.key === propKeys.tag);

  const { tags, isLoadingTags } = useTags(spaceId, property?.id ?? "", { execute: isOpen });
  const currentTags =
    (object?.properties as PropertyWithValue[])?.find((p) => p.key === propKeys.tag)?.multi_select || [];

  const [selectedTags, availableTags] = partition(tags || [], (tag) => currentTags.some((t: Tag) => t.id === tag.id));

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

  return (
    <>
      <ActionPanel.Submenu
        title="Add Tag"
        icon={Icon.Tag}
        shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
        isLoading={isLoadingProperties || isLoadingTags}
        onOpen={() => setIsOpen(true)}
      >
        {availableTags.map((tag) => (
          <Action
            key={tag.id}
            title={tag.name}
            icon={{ source: Icon.Tag, tintColor: tag.color }}
            onAction={() => addTag(tag)}
          />
        ))}
      </ActionPanel.Submenu>

      {selectedTags.length > 0 && (
        <ActionPanel.Submenu
          title="Remove Tag"
          icon={Icon.Tag}
          shortcut={{ modifiers: ["ctrl", "shift"], key: "t" }}
          isLoading={isLoadingProperties || isLoadingTags}
        >
          {selectedTags.map((tag) => (
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
