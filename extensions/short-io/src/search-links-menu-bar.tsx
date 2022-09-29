import { Clipboard, Icon, MenuBarExtra, open, openCommandPreferences, showHUD } from "@raycast/api";
import React from "react";
import { getShortLinks } from "./hooks/hooks";

export default function SearchLinks() {
  const { shortLinks, loading } = getShortLinks(0);

  return (
    <MenuBarExtra
      icon={{
        source: {
          light: "my-link-icon-menu-bar.png",
          dark: "my-link-icon-menu-bar@dark.png",
        },
      }}
      isLoading={loading}
    >
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
            <MenuBarExtra.Item icon={Icon.Clock} title={"Created At: " + value.createdAt} />
            <MenuBarExtra.Item icon={Icon.Clock} title={"Updated At: " + value.updatedAt} />
          </MenuBarExtra.Submenu>
        );
      })}
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title={"Preferences"}
        icon={Icon.Gear}
        onAction={() => {
          openCommandPreferences().then();
        }}
        shortcut={{ modifiers: ["cmd"], key: "," }}
      />
    </MenuBarExtra>
  );
}
