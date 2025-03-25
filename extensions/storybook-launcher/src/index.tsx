import { ActionPanel, List, LocalStorage, Icon } from "@raycast/api";
import { Storybooks } from "./components/Storybooks";
import { useCallback, useEffect, useState } from "react";
import { Storybook } from "./types";
import AddStorybookAction from "./components/AddStorybookAction";
import { nanoid } from "nanoid";

// https://master--5ccbc373887ca40020446347.chromatic.com
// https://tetra.chromatic.com

interface State {
  error?: string;
  storybooks: Storybook[];
}

export default function Command() {
  const [state, setState] = useState<State>({
    storybooks: [],
  });

  useEffect(() => {
    (async () => {
      const storedStorybooks = await LocalStorage.getItem<string>("storybooks");

      if (!storedStorybooks) {
        return;
      }

      try {
        const storybooks: Storybook[] = JSON.parse(storedStorybooks);
        setState({ storybooks });
      } catch (e) {
        // can't decode storybooks
        setState({ error: "No Storybooks configured. Please add a Storybook URL.", storybooks: [] });
      }
    })();
  }, []);

  useEffect(() => {
    LocalStorage.setItem("storybooks", JSON.stringify(state.storybooks));
  }, [state.storybooks]);

  const handleAdd = useCallback(
    (name: string, url: string) => {
      const newStorybooks = [...state.storybooks, { id: nanoid(), name, url }];
      setState((previous) => ({ ...previous, storybooks: newStorybooks }));
    },
    [state.storybooks, setState]
  );

  const handleDelete = useCallback(
    (id: string) => {
      const newStorybooks = state.storybooks.filter((story) => story.id !== id);
      setState((previous) => ({ ...previous, storybooks: newStorybooks }));
    },
    [state.storybooks, setState]
  );

  return (
    <List>
      {state.storybooks.length > 0 ? (
        <Storybooks storybooks={state.storybooks} onCreate={handleAdd} onDelete={handleDelete} />
      ) : (
        <List.EmptyView
          icon={Icon.Tray}
          title="No Storybooks added yet"
          description="Use cmd + n to add a Storybook"
          actions={
            <ActionPanel>
              <AddStorybookAction onCreate={handleAdd} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
