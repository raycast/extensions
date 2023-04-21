import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { MODELS, clearStorage, fetchStorage, getStorageCount, sortObject } from "./utils";
import { ModelFormParams, StorageValue } from "./types";
import { useEffect, useState } from "react";
import DisplayResult from "./result";
import AskView from "./ask";

export default function HistoryView() {
  const [items, setItems] = useState<StorageValue>({});
  const { push } = useNavigation();
  useEffect(() => {
    fetchStorage()
      .then((res) => {
        setItems(res);
      })
      .catch((err) => {
        console.log(err);
        showToast(Toast.Style.Failure, "Couldn't fetch storage");
      });
  }, []);

  return (
    <List
      actions={
        <ActionPanel>
          <Action
            title="Ask"
            icon={Icon.Terminal}
            onAction={() => {
              push(<AskView />);
            }}
            shortcut={{ modifiers: ["cmd"], key: "a" }}
          />
        </ActionPanel>
      }
    >
      {Object.keys(items as StorageValue)?.map((key, index: number) => {
        const item: ModelFormParams = JSON.parse(items[key]);
        return (
          <List.Item
            title={`${MODELS[item?.model as string]?.name}`}
            subtitle={`${item?.prompt?.slice(0, 25)}${item?.prompt?.length && item?.prompt?.length > 25 ? "..." : ""}`}
            key={`storage-item-${index}`}
            actions={
              <ActionPanel>
                <Action
                  title="Resend prompt"
                  icon={Icon.Redo}
                  onAction={() => push(<DisplayResult request={item} />)}
                />
                <Action
                  style={Action.Style.Destructive}
                  title="Clear history"
                  icon={Icon.Trash}
                  onAction={async () => {
                    if (
                      await confirmAlert({
                        title: "Are you sure?",
                        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                      })
                    ) {
                      clearStorage();
                      setItems({});
                    }
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                />
              </ActionPanel>
            }
            accessories={getAccessories(item)}
          />
        );
      })}
    </List>
  );
}

const getAccessories = (item: ModelFormParams) => {
  const accessories = [];
  const PARAMS: { [k: string]: string } = {
    frequencyPenalty: "Freq",
    presencePenalty: "Pres",
    n: "N",
    size: "Size",
    temperature: "Temp",
    role: "Role",
  };
  for (const key in item) {
    if (key in PARAMS && key !== "role")
      accessories.push({ text: `${PARAMS[key]} : ` }, { tag: { value: item[key], color: Color.PrimaryText } });
    if (key === "role" && !["user", "assistant", "none"]?.includes(item?.role as string))
      accessories.push({
        tag: { value: "system", color: Color.PrimaryText },
      });
    // if (key in PARAMS) accessories.push({ tag: { value: item[key], color: Color.PrimaryText } });
  }
  return accessories;
};
