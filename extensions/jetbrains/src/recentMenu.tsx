import { Icon, MenuBarExtra, open } from "@raycast/api";
import { JetBrainsIcon, recentEntry, toolsInstall } from "./util";
import { openInApp } from "./components/OpenInJetBrainsApp";
import { useAppHistory } from "./useAppHistory";
import { openToolbox } from "./components/OpenJetBrainsToolbox";
import React from "react";

const maxTitleLength = 32;
const menuIcon = {
  source: {
    dark: `${toolsInstall}/Contents/Resources/toolbox-tray-dark@2x.png`,
    light: `${toolsInstall}/Contents/Resources/toolbox-tray@2x.png`,
  },
};

export default function ProjectList(): React.JSX.Element {
  const { isLoading, toolboxApp, appHistory, myFavs, recent, visitActions } = useAppHistory();
  if (toolboxApp === undefined || toolboxApp === false) {
    return (
      <MenuBarExtra isLoading={isLoading} icon={menuIcon}>
        <MenuBarExtra.Item title={"Jetbrains Toolbox not found, please install it"} />
        <MenuBarExtra.Item
          title={"Open Raycast command for more info"}
          onAction={() => open("raycast://extensions/gdsmith/jetbrains/recent")}
        />
      </MenuBarExtra>
    );
  } else if (!toolboxApp.isV2) {
    return (
      <MenuBarExtra isLoading={isLoading} icon={menuIcon}>
        <MenuBarExtra.Item title={"Wrong Jetbrains Toolbox version, please use V2"} />
        <MenuBarExtra.Item title={`Current ToolBox version: ${toolboxApp.version}`} />
      </MenuBarExtra>
    );
  }
  return (
    <MenuBarExtra isLoading={isLoading} icon={menuIcon}>
      {isLoading ? null : (
        <>
          {toolboxApp && (
            <MenuBarExtra.Item
              icon={JetBrainsIcon}
              title={`Open ${toolboxApp.name}`}
              onAction={() => open(toolboxApp?.path)}
            />
          )}
          {myFavs.length ? (
            <MenuBarExtra.Section title="Favorites">
              {myFavs.map((fav) => (
                <MenuBarExtra.Item
                  icon={fav.icon}
                  key={`${fav.appName}.${fav.path}`}
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
                    visitActions.visit
                  )}
                />
              ))}
            </MenuBarExtra.Section>
          ) : null}
          {recent.length ? (
            <MenuBarExtra.Section title="Recent">
              {recent.slice(0, 10).map((recent) => (
                <MenuBarExtra.Item
                  icon={recent.icon}
                  key={`${recent.appName}.${recent.path}`}
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
                  onAction={openInApp(
                    appHistory.find((history) => history.title === recent.appName) || appHistory[0],
                    recent,
                    visitActions.visit
                  )}
                />
              ))}
            </MenuBarExtra.Section>
          ) : null}
          <MenuBarExtra.Section>
            {appHistory.map((app) => (
              <MenuBarExtra.Submenu icon={app.icon} title={app.title} key={app.title}>
                <MenuBarExtra.Item
                  icon={app.icon}
                  title={`Open ${app.title}`}
                  onAction={() => open(app.app?.path ?? "")}
                />
                <MenuBarExtra.Section>
                  {app.entries
                    ? app.entries
                        .filter((recent) => recent.path !== "unsupported")
                        .map((recent: recentEntry) =>
                          recent?.path ? (
                            recent.path === "missing" && recent.title === "missing" ? (
                              <MenuBarExtra.Item
                                key={`${recent.appName}.${recent.path}`}
                                title={`Missing config, please relaunch JetBrains Toolbox`}
                                onAction={() => openToolbox(toolboxApp, true)}
                                icon={Icon.ExclamationMark}
                              />
                            ) : (
                              <MenuBarExtra.Item
                                key={`${app.title}-${recent.path}`}
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
                                onAction={openInApp(app, recent, visitActions.visit)}
                              />
                            )
                          ) : null
                        )
                    : null}
                </MenuBarExtra.Section>
              </MenuBarExtra.Submenu>
            ))}
          </MenuBarExtra.Section>
        </>
      )}
    </MenuBarExtra>
  );
}
