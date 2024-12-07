import { List } from "@raycast/api";

export function WaitView(props: { ready: boolean }) {
  return (
    <List isLoading={!props.ready}>
      <List.EmptyView
        icon={"jwt.svg"}
        title={"Select with the cursor or copy to the clipboard the JWT that you want to decode."}
      />
    </List>
  );
}
