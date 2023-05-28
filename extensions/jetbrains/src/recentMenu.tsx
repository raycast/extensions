import React from "react";
import { MenuBarExtra, open } from "@raycast/api";
import { recentEntry } from "./util";
import { openInApp } from "./components/OpenInJetBrainsApp";
import { useAppHistory } from "./useAppHistory";

const maxTitleLength = 32;

export default function ProjectList(): JSX.Element {
  const { isLoading, appHistory, myFavs, filter, histories } = useAppHistory();

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
          {myFavs.length && filter === ""
            ? myFavs.map((fav) => (
                <MenuBarExtra.Item
                  icon={(appHistory.find((history) => history.title === fav.appName) || appHistory[0]).icon}
                  key={fav.path}
                  title={fav.title}
                  onAction={openInApp(
                    appHistory.find((history) => history.title === fav.appName) || appHistory[0],
                    fav
                  )}
                />
              ))
            : null}
          {appHistory
            .filter((app) => filter === "" || filter === app.title)
            .map((app, id) => (
              <MenuBarExtra.Submenu icon={app.icon} title={app.title} key={app.title}>
                {app.entries ? (
                  app.entries
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
                          onAction={openInApp(app, recent)}
                        />
                      ) : null
                    )
                ) : (
                  <MenuBarExtra.Item
                    icon={app.icon}
                    title={`Open ${app.title}`}
                    onAction={() => open(app.app?.path ?? "")}
                  />
                )}
              </MenuBarExtra.Submenu>
            ))}
        </>
      )}
    </MenuBarExtra>
  );
}
