import { ActionPanel, List, Action, Icon, Color } from "@raycast/api";
import { NoteDetail } from "./NoteDetail";
import type { NoteListData } from "../utils/types";

type Props = { data: NoteListData };

export const NotesList = ({ data }: Props) => (
  <List.Item
    icon={{ source: Icon.List, tintColor: Color.Blue }}
    title={data.title}
    actions={
      <ActionPanel>
        <Action.Push title={data.title} target={<NoteDetail id={data.id} />} />
      </ActionPanel>
    }
  />
);
