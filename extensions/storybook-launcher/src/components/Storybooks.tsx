import { ActionPanel, List, Action, Icon, useNavigation } from "@raycast/api";
import { Storybook } from "../types";
import { Components } from "./Components";
import AddStorybookAction from "./AddStorybookAction";
import DeleteStorybookAction from "./DeleteStorybookAction";

export function Storybooks({
  storybooks,
  onCreate,
  onDelete,
}: {
  storybooks: Storybook[];
  onCreate: (name: string, url: string) => void;
  onDelete: (id: string) => void;
}) {
  const { push } = useNavigation();

  return (
    <>
      {storybooks.map((storybook) => (
        <List.Item
          key={storybook.name}
          title={storybook.name}
          icon={Icon.Book}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.ArrowRight}
                title="View Components"
                onAction={() => push(<Components title={storybook.name} url={storybook.url} />)}
              />
              <AddStorybookAction onCreate={onCreate} />
              <DeleteStorybookAction name={storybook.name} id={storybook.id} onDelete={onDelete} />
            </ActionPanel>
          }
        />
      ))}
    </>
  );
}
