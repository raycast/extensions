import { Form, LocalStorage, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
    import { TRIGGER_FILTERS_KEY } from "../utils/constants";
    import { useEffect, useState } from "react";
    import { getAllTagsAPI } from "../utils/n8n-api-utils";
    import { Tag } from "../types/types"; // Assuming Tag type is defined in types.ts

    export default function TriggerFilterForm() {
      const { pop } = useNavigation();
      const [selectedTagNames, setSelectedTagNames] = useState<string[]>([]);
      const [availableTags, setAvailableTags] = useState<Tag[]>([]);
      const [isLoading, setIsLoading] = useState<boolean>(true);

      useEffect(() => {
        async function loadData() {
          setIsLoading(true);
          try {
            // Load saved filters
            const storedFilters = await LocalStorage.getItem<string>(TRIGGER_FILTERS_KEY);
            if (storedFilters) {
              setSelectedTagNames(JSON.parse(storedFilters));
            }

            // Fetch available tags
            const tagsFromApi = await getAllTagsAPI();
            setAvailableTags(tagsFromApi);

          } catch (error) {
            console.error("Failed to load filter data:", error);
            await showToast({
              style: Toast.Style.Failure,
              title: "Failed to load filter settings",
              message: error instanceof Error ? error.message : String(error),
            });
          } finally {
            setIsLoading(false);
          }
        }
        loadData();
      }, []);

      return (
        <Form
          isLoading={isLoading}
          actions={
            <ActionPanel>
              <Action.SubmitForm
                title="Save Filters"
                onSubmit={async (values) => {
                  const tagsToSave = values.tags || [];
                  try {
                    await LocalStorage.setItem(TRIGGER_FILTERS_KEY, JSON.stringify(tagsToSave));
                    await showToast({ style: Toast.Style.Success, title: "Filters Saved" });
                    pop(); // Close the form after saving
                  } catch (error) {
                     await showToast({ style: Toast.Style.Failure, title: "Failed to save filters" });
                  }
                }}
              />
               <Action
                 title="Clear Filters"
                 style={Action.Style.Destructive}
                 onAction={async () => {
                   try {
                     await LocalStorage.removeItem(TRIGGER_FILTERS_KEY);
                     setSelectedTagNames([]); // Clear state as well
                     await showToast({ style: Toast.Style.Success, title: "Filters Cleared" });
                     pop();
                   } catch (error) {
                     await showToast({ style: Toast.Style.Failure, title: "Failed to clear filters" });
                   }
                 }}
                 shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
               />
            </ActionPanel>
          }
        >
          <Form.TagPicker
            id="tags"
            title="Filter by Tags"
            value={selectedTagNames}
            onChange={setSelectedTagNames}
          >
            {availableTags.map((tag) => (
              <Form.TagPicker.Item key={tag.id || tag.name} value={tag.name} title={tag.name} />
            ))}
          </Form.TagPicker>
          <Form.Description text="Select tags to show only workflows containing AT LEAST ONE of the selected tags. Leave empty to show all." />
        </Form>
      );
    }