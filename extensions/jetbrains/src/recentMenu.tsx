import React from "react";
import { MenuBarExtra, open } from "@raycast/api";
import { JetBrainsIcon, recentEntry } from "./util";
import { openInApp } from "./components/OpenInJetBrainsApp";
import { useAppHistory } from "./useAppHistory";

const maxTitleLength = 32;

export default function ProjectList(): JSX.Element {
  const { isLoading, toolboxApp, appHistory, myFavs, filter, histories } = useAppHistory();
  const v2 = Boolean(toolboxApp?.isV2);
  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={{
        source: {
          dark: "/Applications/JetBrains Toolbox.app/Contents/Resources/toolbox-tray-dark@2x.png",
          light: "/Applications/JetBrains Toolbox.app/Contents/Resources/toolbox-tray@2x.png",
        },
      }}
    >
      {isLoading ? null : (
        <>
          {toolboxApp && (
            <MenuBarExtra.Item
              icon={JetBrainsIcon}
              title={`Open ${toolboxApp.name}`}
              onAction={() => open(toolboxApp?.path)}
            />
          )}
          <MenuBarExtra.Separator />
          {myFavs.length && filter === "" ? (
            <>
              {myFavs.map((fav) => (
                <MenuBarExtra.Item
                  icon={(appHistory.find((history) => history.title === fav.appName) || appHistory[0]).icon}
                  key={fav.path}
                  title={`Open ${
                    fav.title.length < maxTitleLength ? fav.title : fav.title.substring(0, maxTitleLength - 1) + "…"
                  }`}
                  subtitle={`← ${
                    fav.title.length + fav.parts.length < maxTitleLength
                      ? fav.parts
                      : fav.parts.substring(0, maxTitleLength - fav.title.length - 2) + "…"
                  }`}
                  onAction={openInApp(
                    appHistory.find((history) => history.title === fav.appName) || appHistory[0],
                    fav,
                    v2
                  )}
                />
              ))}
              <MenuBarExtra.Separator />
            </>
          ) : null}
          {appHistory
            .filter((app) => filter === "" || filter === app.title)
            .map((app, id) => (
              <MenuBarExtra.Submenu icon={app.icon} title={app.title} key={app.title}>
                <MenuBarExtra.Item
                  icon={app.icon}
                  title={`Open ${app.title}`}
                  onAction={() => open(app.app?.path ?? "")}
                />
                {app.entries && <MenuBarExtra.Separator />}
                {app.entries
                  ? app.entries
                      .filter((entry) => filter !== "" || (histories[id] ?? []).includes(entry.path))
                      .map((recent: recentEntry, index) =>
                        recent?.path ? (
                          <MenuBarExtra.Item
                            key={`${app.title}-${recent.path}`}
                            icon={app.icon}
                            title={`Open ${
                              recent.title.length < maxTitleLength
                                ? recent.title
                                : recent.title.substring(0, maxTitleLength - 1) + "…"
                            }`}
                            subtitle={`← ${
                              recent.title.length + recent.parts.length < maxTitleLength
                                ? recent.parts
                                : recent.parts.substring(0, maxTitleLength - recent.title.length - 2) + "…"
                            }`}
                            tooltip={`Open ${recent.path} in ${app.title}`}
                            onAction={openInApp(app, recent, v2)}
                          />
                        ) : null
                      )
                  : null}
              </MenuBarExtra.Submenu>
            ))}
        </>
      )}
    </MenuBarExtra>
  );
}
