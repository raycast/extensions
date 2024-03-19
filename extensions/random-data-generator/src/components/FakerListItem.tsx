import isUrl from "is-url";
import _ from "lodash";
import { Fragment, useEffect, useState } from "react";

import { Action, ActionPanel, Icon, List } from "@raycast/api";

import type { Faker } from "@/faker";
import usePreferences from "@/hooks/usePreferences";

export type Item = {
  section: string;
  id: string;
  value: string;
  getValue(): string;
};

export type Pin = (item: Item) => void;

interface FakerListItemProps {
  item: Item;
  pin?: Pin;
  unpin?: Pin;
  faker: Faker;
}

function DefaultActions({ value, updateValue }: { value: string; updateValue: () => void }) {
  const defaultAction = usePreferences("defaultAction");

  if (defaultAction === "paste") {
    return (
      <Fragment>
        <Action.Paste title="Paste in Active App" content={value} onPaste={updateValue} />
        <Action.CopyToClipboard title="Copy to Clipboard" content={value} onCopy={updateValue} />
      </Fragment>
    );
  }
  return (
    <Fragment>
      <Action.CopyToClipboard title="Copy to Clipboard" content={value} onCopy={updateValue} />
      <Action.Paste title="Paste in Active App" content={value} onPaste={updateValue} />
    </Fragment>
  );
}

export default function FakerListItem({ item, pin, unpin, faker }: FakerListItemProps) {
  const [value, setValue] = useState(item.value);

  const updateValue = async () => {
    setValue(item.getValue());
  };

  useEffect(() => {
    updateValue();
  }, [item]);

  return (
    <List.Item
      title={_.startCase(item.id)}
      icon={Icon.Dot}
      keywords={[item.section]}
      detail={<List.Item.Detail markdown={value} />}
      actions={
        <ActionPanel>
          <DefaultActions value={value} updateValue={updateValue} />
          {isUrl(value) && <Action.OpenInBrowser url={value} shortcut={{ modifiers: ["cmd"], key: "o" }} />}
          {pin && (
            <Action
              title="Pin Entry"
              icon={Icon.Pin}
              shortcut={{ modifiers: ["shift", "cmd"], key: "p" }}
              onAction={() => pin(item)}
            />
          )}
          {unpin && (
            <Action
              title="Unpin Entry"
              icon={Icon.XMarkCircle}
              shortcut={{ modifiers: ["shift", "cmd"], key: "p" }}
              onAction={() => unpin(item)}
            />
          )}
          <Action
            title="Refresh Value"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["ctrl"], key: "r" }}
            onAction={updateValue}
          />
          <Action.CreateQuicklink
            title="Create Copy Quicklink"
            quicklink={{
              name: `Copy Random ${_.startCase(item.id)}`,
              link: `raycast://extensions/loris/random/open-quicklink?arguments=${encodeURIComponent(
                JSON.stringify({
                  section: item.section,
                  id: item.id,
                  locale: faker.locale,
                  mode: "copy",
                }),
              )}`,
            }}
          />
          <Action.CreateQuicklink
            title="Create Paste Quicklink"
            quicklink={{
              name: `Paste Random ${_.startCase(item.id)}`,
              link: `raycast://extensions/loris/random/open-quicklink?arguments=${encodeURIComponent(
                JSON.stringify({
                  section: item.section,
                  id: item.id,
                  locale: faker.locale,
                  mode: "paste",
                }),
              )}`,
            }}
          />
        </ActionPanel>
      }
    />
  );
}
