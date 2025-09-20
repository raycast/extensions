import { Color, Icon, List } from "@raycast/api";
import { checkLogin } from "../apis";

export function CheckLogin({ children }: { children: React.ReactNode }) {
  if (checkLogin()) return <>{children}</>;

  return (
    <List>
      <List.EmptyView
        icon={{
          source: Icon.ExclamationMark,
          tintColor: Color.Red,
        }}
        title="Please use Login Bilibili command to login first."
      />
    </List>
  );
}
