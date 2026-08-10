import { Action, ActionPanel, Clipboard, Color, Icon } from "@raycast/api";

import { useContext, useState } from "react";

import { AvailableColor } from "../colors/Color";
import { Services } from "../Extension";

import { asyncEffect } from "../utilities";
import GeneralActions from "./GeneralActions";
import ServicesContext from "./ServicesContext";

export default function ColorActions({ color, storageMode }: { color: AvailableColor; storageMode: boolean }) {
  const { renderer, history, favorites } = useContext(ServicesContext) as Services;

  function copyTitle(altColor: AvailableColor): string {
    const [title, setTitle] = useState<string>(`Copy in ${altColor.type}`);

    if (!storageMode) {
      asyncEffect(Clipboard.readText(), (text) => {
        if (text === altColor.stringValue()) {
          setTitle(`Add to History`);
        }
      });
    }

    return title;
  }

  const pasteAction = (
    <ActionPanel.Section key="paste-section">
      <Action.Paste content={color.stringValue()} icon={Icon.Document} />
      {!favorites.has(color) ? (
        <Action
          title={"Add to Favorites"}
          icon={{ source: Icon.Star, tintColor: Color.Yellow }}
          onAction={() => {
            favorites.add(color);
            renderer.cancel();
          }}
        />
      ) : (
        <Action
          title={"Remove from Favorites"}
          icon={{ source: Icon.Trash, tintColor: Color.Red }}
          onAction={() => favorites.remove(color)}
        />
      )}
    </ActionPanel.Section>
  );

  const copyActions = (
    <ActionPanel.Section key="copy-section">
      {color.alternatives.map((altColor: AvailableColor, index: number) => (
        <Action.CopyToClipboard
          key={index}
          title={copyTitle(altColor)}
          shortcut={altColor.shortcut}
          content={altColor.stringValue()}
          onCopy={() => {
            history.add(altColor);
            renderer.cancel();
          }}
        />
      ))}
    </ActionPanel.Section>
  );

  return (
    <ActionPanel>
      {storageMode ? [pasteAction, copyActions] : [copyActions, pasteAction]}
      <GeneralActions history={history} />
    </ActionPanel>
  );
}
