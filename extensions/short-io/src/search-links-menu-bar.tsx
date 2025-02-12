import { Clipboard, Icon, MenuBarExtra, open, openCommandPreferences, showHUD } from "@raycast/api";
import React, { useMemo } from "react";
import { useShortLinks } from "./hooks/useShortLinks";
import { formatISODate } from "./utils/common-utils";

export default function SearchLinks() {
  const { data, isLoading } = useShortLinks();
  const shortLinks = useMemo(() => {
    return data || [];
  }, [data]);

  return (
    <MenuBarExtra icon={Icon.Link} isLoading={isLoading}>
      {shortLinks.length === 0 && <MenuBarExtra.Item title={"No Link"} icon={Icon.Link} />}
      {shortLinks.map((value, index) => {
        return (
          <MenuBarExtra.Submenu
            key={index}
            icon={{
              source: {
                light: "link-icon.svg",
                dark: "link-icon@dark.svg",
              },
            }}
            title={value.shortURL}
          >
            {value.title !== null && <MenuBarExtra.Item icon={Icon.Text} title={"Title: " + value.title + ""} />}
            <MenuBarExtra.Item
              icon={Icon.Link}
              title={"Short Link: " + value.shortURL}
              tooltip={"Short Link"}
              onAction={async (event: MenuBarExtra.ActionEvent) => {
                if (event.type == "left-click") {
                  await showHUD("Copy " + value.shortURL);
                  await Clipboard.copy(value.shortURL);
                } else {
                  await open(value.shortURL);
                }
              }}
            />
            <MenuBarExtra.Item
              icon={Icon.Link}
              title={"Original Link: " + value.originalURL}
              onAction={async (event: MenuBarExtra.ActionEvent) => {
                if (event.type == "left-click") {
                  await showHUD("Copy " + value.originalURL);
                  await Clipboard.copy(value.originalURL);
                } else {
                  await open(value.originalURL);
                }
              }}
            />
            <MenuBarExtra.Item icon={Icon.Store} title={"Source: " + value.source} />
            {value.createdAt && (
              <MenuBarExtra.Item icon={Icon.Clock} title={"Created At: " + formatISODate(value.createdAt)} />
            )}
            {value.updatedAt && (
              <MenuBarExtra.Item icon={Icon.Clock} title={"Updated At: " + formatISODate(value.updatedAt)} />
            )}
          </MenuBarExtra.Submenu>
        );
      })}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={"Settings..."}
          icon={Icon.Gear}
          onAction={() => {
            openCommandPreferences().then();
          }}
          shortcut={{ modifiers: ["cmd"], key: "," }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
