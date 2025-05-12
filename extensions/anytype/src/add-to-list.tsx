import { Action, ActionPanel, Form, popToRoot, showToast, Toast } from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import { addObjectsToList } from "./api";
import { EnsureAuthenticated } from "./components/EnsureAuthenticated";
import { useObjectsInList, useSearch, useSpaces } from "./hooks";
import { bundledTypeKeys } from "./utils";

export interface AddToListValues {
  space: string;
  list: string;
  object: string;
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
  const [selectedSpace, setSelectedSpace] = useState<string>("");
  const [selectedList, setSelectedList] = useState<string>("");
  const [selectedObject, setSelectedObject] = useState<string>("");

  const { spaces, spacesError, isLoadingSpaces } = useSpaces();
  const {
    objects: lists,
    objectsError: listsError,
    isLoadingObjects: isLoadingLists,
  } = useSearch(selectedSpace, listSearchText, [bundledTypeKeys.collection]);
  const { objects, objectsError, isLoadingObjects } = useSearch(selectedSpace, objectSearchText, []);
  const {
    objects: listItems,
    objectsError: listItemsError,
    isLoadingObjects: isLoadingListItems,
  } = useObjectsInList(selectedSpace, selectedList, "");

  useEffect(() => {
    if (spacesError || objectsError || listsError || listItemsError) {
      showFailureToast(spacesError || objectsError || listsError || listItemsError, {
        title: "Failed to fetch latest data",
      });
    }
  }, [spacesError, objectsError, listsError]);

  const { handleSubmit, itemProps } = useForm<AddToListValues>({
    onSubmit: async (values) => {
      setLoading(true);
      try {
        await showToast(Toast.Style.Animated, "Adding object to list...");
        const response = await addObjectsToList(values.space, values.list, [values.object]);
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
      space: (value) => {
        if (!value) {
          return "Space is required";
        }
      },
      list: (value) => {
        if (!value) {
          return "List is required";
        }
      },
      object: (value) => {
        if (!value) {
          return "Object is required";
        }
      },
    },
  });

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
        {...itemProps.space}
        title="Space"
        value={selectedSpace}
        onChange={setSelectedSpace}
        storeValue={true}
        placeholder="Search spaces..."
        info="The space containing the list"
      >
        {spaces.map((space) => (
          <Form.Dropdown.Item key={space.id} value={space.id} title={space.name} icon={space.icon} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        {...itemProps.list}
        title="Collection"
        value={selectedList}
        onChange={setSelectedList}
        onSearchTextChange={setListSearchText}
        storeValue={true}
        placeholder="Search collections..."
        info="The list to add the object to"
      >
        {lists.map((list) => (
          <Form.Dropdown.Item key={list.id} value={list.id} title={list.name} icon={list.icon} />
        ))}
      </Form.Dropdown>

      {selectedList && (
        <Form.Dropdown
          {...itemProps.object}
          title="Object"
          value={selectedObject}
          onChange={setSelectedObject}
          onSearchTextChange={setObjectSearchText}
          throttle={true}
          storeValue={true}
          info="The object to add to the list"
        >
          {objects
            .filter((object) => !listItems.some((item) => item.id === object.id) && object.id !== selectedList)
            .map((object) => (
              <Form.Dropdown.Item key={object.id} value={object.id} title={object.name} icon={object.icon} />
            ))}
        </Form.Dropdown>
      )}
    </Form>
  );
}
