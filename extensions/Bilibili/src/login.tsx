import { logout } from "./apis";
import { useLogin } from "./hooks";

import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  List,
  LocalStorage,
  popToRoot,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";

async function doLogout() {
  // reset localstorage
  await LocalStorage.setItem("notifications", "[]");
  return await logout();
}

export default function Command() {
  const { qrcode, isLogin } = useLogin();

  const markdown = `
## Scan the QR code below to login to Bilibili.

![qrcode_login](${qrcode})`;

  return isLogin ? (
    <List
      actions={
        <ActionPanel>
          <Action
            title="Back To Root"
            icon={{ source: Icon.Undo, tintColor: Color.PrimaryText }}
            onAction={() => popToRoot({ clearSearchBar: true })}
          />
          <Action
            title="Logout"
            icon={{ source: Icon.Logout, tintColor: Color.PrimaryText }}
            onAction={async () => {
              const status = await doLogout();
              if (status) {
                popToRoot({ clearSearchBar: true });
                showHUD("Logout success 🎉");
              } else {
                showToast(Toast.Style.Failure, "Logout failed");
              }
            }}
          />
        </ActionPanel>
      }
    >
      <List.EmptyView
        icon={{
          source: Icon.Check,
          tintColor: Color.Blue,
        }}
        title="You have already logged in. 😉"
        description="Hit <⌘ + ↩> logout your account."
      />
    </List>
  ) : (
    <Detail markdown={markdown} />
  );
}
