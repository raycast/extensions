import { ActionPanel, List, LocalStorage } from "@raycast/api";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useState } from "react";
import { ViewEmpty } from "./components";
import { ActionWebsiteAdd, ActionWebsiteDelete } from "./components/actions";
import ActionWebsiteEdit from "./components/actions/website-edit";
import { Website } from "./types";

type State = {
  isLoading: boolean;
  websites: Website[];
};

export default () => {
  const [state, setState] = useState<State>({
    isLoading: true,
    websites: [],
  });

  useEffect(() => {
    (async () => {
      const storedWebsites = await LocalStorage.getItem<string>("websites");

      if (!storedWebsites) {
        setState((previous) => ({ ...previous, isLoading: false }));
        return;
      }

      try {
        const websites: Website[] = JSON.parse(storedWebsites);
        setState((previous) => ({ ...previous, websites, isLoading: false }));
      } catch (e) {
        setState((previous) => ({ ...previous, websites: [], isLoading: false }));
      }
    })();
  }, []);

  useEffect(() => {
    LocalStorage.setItem("websites", JSON.stringify(state.websites));
  }, [state.websites]);

  const handleCreate = useCallback(
    (url: string) => {
      const newWebsites = [...state.websites, { id: nanoid(), url }];
      setState((previous) => ({ ...previous, websites: newWebsites }));
    },
    [state.websites, setState]
  );

  const handleEdit = useCallback(
    (id: string, url: string) => {
      const newWebsites = [...state.websites].map((website) => ({
        id: website.id,
        url: id === website.id ? url : website.url,
      }));
      setState((previous) => ({ ...previous, websites: newWebsites }));
    },
    [state.websites, setState]
  );

  const handleDelete = useCallback(
    (index: number) => {
      const newWebsites = [...state.websites];
      newWebsites.splice(index, 1);
      setState((previous) => ({ ...previous, websites: newWebsites }));
    },
    [state.websites, setState]
  );

  return (
    <List isLoading={state.isLoading}>
      <ViewEmpty onCreate={handleCreate} />
      {state.websites?.map((website, index) => (
        <List.Item
          key={website.id}
          title={website.url}
          icon={`https://www.google.com/s2/favicons?domain=${website.url}&sz=64`}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <ActionWebsiteAdd onCreate={handleCreate} />
                <ActionWebsiteEdit
                  defaultUrl={website.url}
                  onEdit={(newWebsite) => handleEdit(website.id, newWebsite)}
                />
                <ActionWebsiteDelete onDelete={() => handleDelete(index)} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};
