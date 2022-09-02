import { Clipboard, MenuBarExtra, showHUD } from "@raycast/api";
import React from "react";
import { getShortLinks } from "./hooks/hooks";

export default function SearchLinks() {
  const { shortLinks, loading } = getShortLinks(0);

  return (
    <MenuBarExtra
      icon={{
        source: {
          light: "search-link-icon-menu-bar.png",
          dark: "search-link-icon-menu-bar@dark.png",
        },
      }}
      isLoading={loading}
    >
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
            {value.title !== null && <MenuBarExtra.Item title={"Title: " + value.title + ""} />}
            <MenuBarExtra.Item
              title={"Short Link: " + value.shortURL}
              tooltip={"Short Link"}
              onAction={async () => {
                await showHUD("Copy " + value.shortURL);
                await Clipboard.copy(value.shortURL);
              }}
            />
            <MenuBarExtra.Item
              title={"Original Link: " + value.originalURL}
              onAction={async () => {
                await showHUD("Copy " + value.shortURL);
                await Clipboard.copy(value.shortURL);
              }}
            />
            <MenuBarExtra.Item title={"Source: " + value.source} />
            <MenuBarExtra.Item title={"Created At: " + value.createdAt} />
            <MenuBarExtra.Item title={"Updated At: " + value.updatedAt} />
          </MenuBarExtra.Submenu>
        );
      })}
    </MenuBarExtra>
  );
}
