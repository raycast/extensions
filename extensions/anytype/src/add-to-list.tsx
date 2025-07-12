import { Action, ActionPanel, Form, popToRoot, showToast, Toast } from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import { addObjectsToList } from "./api";
import { EnsureAuthenticated } from "./components/EnsureAuthenticated";
import { useObjectsInList, useSearch, useSpaces } from "./hooks";
import { AddObjectsToListRequest } from "./models";
import { bundledTypeKeys } from "./utils";

export interface AddToListValues {
  spaceId: string;
  listId: string;
  objectId: string;
}

export default function Command() {
  return (
    <EnsureAuthenticated viewType="form">
      <AddToList />
    </EnsureAuthenticated>
  );
}

export function AddToList() {
  const [loading, setLoading] = useState(false);
  const [listSearchText, setListSearchText] = useState("");
  const [objectSearchText, setObjectSearchText] = useState("");

  const { spaces, spacesError, isLoadingSpaces } = useSpaces();
  const { handleSubmit, itemProps, values } = useForm<AddToListValues>({
    onSubmit: async (values) => {
      setLoading(true);
      try {
        await showToast(Toast.Style.Animated, "Adding object to list...");
        const request: AddObjectsToListRequest = { objects: [values.objectId] };
        const response = await addObjectsToList(values.spaceId, values.listId, request);
        if (response.payload) {
          await showToast(Toast.Style.Success, "Object added to list successfully", response.payload);
          popToRoot();
        } else {
          await showToast(Toast.Style.Failure, "Failed to add object to list");
        }
      } catch (error) {
        await showFailureToast(error, { title: "Failed to add object to list" });
      } finally {
        setLoading(false);
      }
    },
    validation: {
      spaceId: (value) => {
        if (!value) {
          return "Space is required";
        }
      },
      listId: (value) => {
        if (!value) {
          return "List is required";
        }
      },
      objectId: (value) => {
        if (!value) {
          return "Object is required";
        }
      },
    },
  });

  const {
    objects: lists,
    objectsError: listsError,
    isLoadingObjects: isLoadingLists,
  } = useSearch(values.spaceId, listSearchText, [bundledTypeKeys.collection]);
  const { objects, objectsError, isLoadingObjects } = useSearch(values.spaceId, objectSearchText, []);
  const {
    objects: listItems,
    objectsError: listItemsError,
    isLoadingObjects: isLoadingListItems,
  } = useObjectsInList(values.spaceId, values.listId, "");

  useEffect(() => {
    if (spacesError || objectsError || listsError || listItemsError) {
      showFailureToast(spacesError || objectsError || listsError || listItemsError, {
        title: "Failed to fetch latest data",
      });
    }
  }, [spacesError, objectsError, listsError, listItemsError]);

  return (
    <Form
      isLoading={loading || isLoadingSpaces || isLoadingObjects || isLoadingLists || isLoadingListItems}
      enableDrafts={false}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add to List" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        {...itemProps.spaceId}
        title="Space"
        storeValue={true}
        placeholder="Search spaces..."
        info="The space containing the list"
      >
        {spaces.map((space) => (
          <Form.Dropdown.Item key={space.id} value={space.id} title={space.name} icon={space.icon} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        {...itemProps.listId}
        title="Collection"
        onSearchTextChange={setListSearchText}
        storeValue={true}
        placeholder="Search collections..."
        info="The list to add the object to"
      >
        {lists.map((list) => (
          <Form.Dropdown.Item key={list.id} value={list.id} title={list.name} icon={list.icon} />
        ))}
      </Form.Dropdown>

      {values.listId && (
        <Form.Dropdown
          {...itemProps.objectId}
          title="Object"
          onSearchTextChange={setObjectSearchText}
          throttle={true}
          storeValue={true}
          placeholder="Search objects..."
          info="The object to add to the list"
        >
          {objects
            .filter((object) => !listItems.some((item) => item.id === object.id) && object.id !== values.listId)
            .map((object) => (
              <Form.Dropdown.Item key={object.id} value={object.id} title={object.name} icon={object.icon} />
            ))}
        </Form.Dropdown>
      )}
    </Form>
  );
}
