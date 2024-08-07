import {
  ActionPanel,
  Action,
  Icon,
  List,
  openExtensionPreferences,
} from "@raycast/api";
import { useEffect, useState } from "react";
import OtpListItems from "./OtpListItems";
import { Service } from "../../util/service";
import { checkError, loadData } from "./otp-helpers";

export function OtpList() {
  const [items, setItems] = useState<{
    otpList: Service[];
    isLoading: boolean;
  }>({
    otpList: [],
    isLoading: true,
  });

  useEffect(() => {
    loadData(setItems);
  }, []);

  // error checking
  useEffect(() => {
    checkError(items.otpList, items.isLoading);
  }, [items]);

  return (
    <List searchBarPlaceholder="Search" isLoading={items.isLoading}>
      {items.otpList.length == 0 ? (
        <List.EmptyView
          icon={Icon.SpeechBubbleImportant}
          title={"Add Services with Aegis"}
          description={"Then export a backup from Aegis and use it here"}
          actions={
            <ActionPanel>
              <Action
                title="Open Extension Preferences"
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      ) : (
        <OtpListItems items={items.otpList} setItems={setItems} />
      )}
    </List>
  );
}
