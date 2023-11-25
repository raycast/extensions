import { Action, ActionPanel, Form, Icon, LocalStorage, useNavigation } from "@raycast/api";
import { Dispatch, SetStateAction } from "react";
import { Timezone } from "./types/types";
import { isEmpty } from "./utils/common-utils";
import { icons, localStorageKey } from "./utils/costants";

export default function EditTimeZone(props: {
  index: number;
  starTimezones: Timezone[];
  setRefresh: Dispatch<SetStateAction<number>>;
}) {
  const { index, starTimezones, setRefresh } = props;
  const timezone = starTimezones[index];
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle={"Edit Timezone"}
      actions={
        <ActionPanel>
          <Action
            icon={Icon.Download}
            title={"Save Timezone"}
            onAction={async () => {
              await LocalStorage.setItem(localStorageKey.STAR_TIMEZONE, JSON.stringify(starTimezones));
              setRefresh(Date.now());
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description title={"Timezone"} text={timezone.timezone} />
      <Form.TextField
        id={"Alias"}
        title="Alias"
        defaultValue={isEmpty(timezone.alias) ? "" : timezone.alias}
        onChange={(newValue) => {
          starTimezones[index].alias = newValue.trim();
        }}
      />
      <Form.Dropdown
        id={"Memo Icon"}
        title={"Memo Icon"}
        defaultValue={starTimezones[index].memoIcon}
        onChange={(newValue) => {
          starTimezones[index].memoIcon = newValue as Icon;
        }}
      >
        {icons.map((value) => {
          return <Form.Dropdown.Item key={value} title={" "} icon={value} value={value} />;
        })}
      </Form.Dropdown>

      <Form.TextField
        id={"Memo"}
        title="Memo"
        defaultValue={isEmpty(timezone.memo) ? "" : timezone.memo}
        onChange={(newValue) => {
          starTimezones[index].memo = newValue.trim();
        }}
      />
    </Form>
  );
}
