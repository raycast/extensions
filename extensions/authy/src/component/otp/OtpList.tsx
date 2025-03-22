import { ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import OtpListItems from "./OtpListItems";
import { Service } from "../login/login-helper";
import { checkError, commonActions, loadData, refresh } from "./otp-helpers";

export function OtpList(props: { isLogin: boolean | undefined; setLogin: (login: boolean) => void }) {
  const [items, setItems] = useState<{ otpList: Service[]; isLoading: boolean }>({
    otpList: [],
    isLoading: true,
  });

  useEffect(() => {
    if (!props.isLogin) {
      return;
    }
    loadData(setItems);
  }, [props.isLogin]);

  // error checking
  useEffect(() => {
    checkError(items.otpList);
  }, [items]);

  return (
    <List searchBarPlaceholder="Search" isLoading={items.isLoading}>
      {items.otpList.length == 0 ? (
        <List.EmptyView
          icon={Icon.SpeechBubbleImportant}
          title={"Add Services with Authy App to start"}
          description={"Then sync the extension with ⌘ + R"}
          actions={<ActionPanel>{commonActions(async () => await refresh(setItems))}</ActionPanel>}
        />
      ) : (
        <OtpListItems items={items.otpList} setItems={setItems} />
      )}
    </List>
  );
}
