import { Icon, Keyboard, launchCommand, LaunchType, MenuBarExtra, open } from "@raycast/api";
import { useFetch, useLocalStorage } from "@raycast/utils";
import { useEffect, useState } from "react";
import templates from "./templates";

type VersionAPIResponse = {
  version: string;
};

export default function Command() {
  const { isLoading, data, revalidate } = useFetch<VersionAPIResponse>("https://wpbones.com/api/version");
  const {
    value: versionStorage,
    setValue: setVersionStorage,
    isLoading: isLoadingVersionStorage,
  } = useLocalStorage("wpbones-version", 160);

  const [newVersion, setNewVersion] = useState<boolean>(false);

  useEffect(() => {
    if (data && versionStorage) {
      const version = parseInt(data.version.replace(/\./g, ""));
      if (version > versionStorage) {
        setNewVersion(true);
      }
      //setVersionStorage(version);
    }
  }, [data, versionStorage]);

  return (
    <MenuBarExtra
      isLoading={isLoading || isLoadingVersionStorage}
      icon={`menu-bar${newVersion ? "-updates" : ""}.svg`}
      tooltip="WP Bones"
    >
      <MenuBarExtra.Item
        icon={`menu-bar${newVersion ? "-updates" : ""}.svg`}
        title={newVersion ? `New version available: ${data?.version}` : `WP Bones v${data?.version}`}
        onAction={() => {
          if (data) {
            const version = parseInt(data.version.replace(/\./g, ""));
            setVersionStorage(version);
          }

          open("https://wpbones.com/docs/release-notes");
          revalidate();
        }}
      />

      <MenuBarExtra.Section title="Useful">
        <MenuBarExtra.Item
          title="FAQs"
          icon={Icon.QuestionMarkCircle}
          onAction={() => open("https://wpbones.com/docs/faqs")}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Developing">
        <MenuBarExtra.Item
          title="Search Documentation"
          icon={Icon.Book}
          onAction={() => launchCommand({ name: "search-documentation", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Submenu icon="github-white.png" title="Clone a WP Bones Repository">
          {templates.map((template) =>
            template.name === "WPKirk" ? null : (
              <MenuBarExtra.Item
                key={template.name}
                title={template.title}
                icon={template?.icon}
                shortcut={template?.shortcut as Keyboard.Shortcut}
                onAction={() => {
                  open(`https://github.com/new?template_name=${template.name}&template_owner=wpbones`);
                }}
              />
            ),
          )}
          <MenuBarExtra.Section>
            <MenuBarExtra.Item
              title="Complete Demo"
              icon="box.svg"
              onAction={() => {
                open(`https://github.com/new?template_name=WPKirk&template_owner=wpbones`);
              }}
            />
          </MenuBarExtra.Section>
        </MenuBarExtra.Submenu>

        <MenuBarExtra.Item
          title="Open an issue"
          icon={Icon.Bug}
          onAction={() => open("https://github.com/wpbones/WPBones/issues")}
        />
        <MenuBarExtra.Item
          title="WP Bones AI"
          icon={"brand-github-copilot.svg"}
          onAction={() => open("https://wpbones.ownai.com/")}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Community">
        <MenuBarExtra.Item
          icon="brand-discord.svg"
          title="Discord"
          onAction={() => {
            open("https://discord.gg/dCP5NajK");
          }}
        />
        <MenuBarExtra.Item
          title="Discussion"
          icon="messages.svg"
          onAction={() => open("https://github.com/wpbones/WPBones/discussions")}
        />
        <MenuBarExtra.Item
          title="Newsletter"
          icon="mail-heart.svg"
          onAction={() => {
            open("https://wpbones.substack.com/");
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
