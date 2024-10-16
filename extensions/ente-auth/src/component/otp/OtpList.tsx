import {
  Action,
  ActionPanel,
  Icon,
  List,
  openExtensionPreferences,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { Service } from "../../util/service";
import { loadData } from "./otp-helpers";
import OtpListItems from "./OtpListItems";

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

  return (
    <List searchBarPlaceholder="Search" isLoading={items.isLoading}>
      {items.otpList.length == 0 ? (
        <List.EmptyView
          icon={Icon.SpeechBubbleImportant}
          title={"Add Services with Ente Auth"}
          description={"Then export a backup from Ente Auth and use it here"}
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
