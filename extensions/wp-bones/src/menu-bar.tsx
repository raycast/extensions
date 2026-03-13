import { Color, Icon, Image, Keyboard, launchCommand, LaunchType, MenuBarExtra, open } from "@raycast/api";
import { useEffect, useState } from "react";
import { useBoilerplates } from "./hooks/use-boilerplates";
import { useVersion } from "./hooks/use-version";
import { getIcon } from "./utils";

export default function Command() {
  const [iconMenu, setIconMenu] = useState<Image.ImageLike>("menu-bar.svg");
  const [titleMenu, setTitleMenu] = useState("WP Bones");

  const { isThereNewVersion, version, flushNewVersion, isLoading, error } = useVersion();

  const { boilerplates } = useBoilerplates();

  useEffect(() => {
    if (error) {
      setIconMenu({
        source: Icon.ExclamationMark,
        tintColor: Color.Red,
      });
      setTitleMenu("Error fetching version");
    }

    if (isLoading) {
      setIconMenu("loading.svg");
      setTitleMenu("Loading version");
    }

    if (isThereNewVersion) {
      setIconMenu("menu-bar-updates.svg");
      setTitleMenu(`New version available: ${version}`);
    } else {
      setIconMenu("menu-bar.svg");
      setTitleMenu(`WP Bones v${version}`);
    }
  }, [error, version, isThereNewVersion, isLoading]);

  return (
    <MenuBarExtra isLoading={isLoading} icon={iconMenu} tooltip="WP Bones">
      <MenuBarExtra.Item
        icon={iconMenu}
        title={titleMenu}
        onAction={() => {
          flushNewVersion();
          open("https://wpbones.com/docs/release-notes");
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

        <MenuBarExtra.Submenu icon="brand-wordpress.svg" title="See Boilerplate in Action">
          {boilerplates &&
            boilerplates.map((template) =>
              template.slug === "deprecated" ? null : (
                <MenuBarExtra.Item
                  key={template.name}
                  title={template.title}
                  icon={getIcon(template?.icon)}
                  shortcut={template?.shortcut as Keyboard.Shortcut}
                  onAction={() => {
                    open(
                      `https://playground.wordpress.net/?blueprint-url=https://www.wpbones.com/wpkirk${template.slug === "base" ? "" : `-${template.slug}`}-boilerplate.json`,
                    );
                  }}
                />
              ),
            )}
        </MenuBarExtra.Submenu>

        <MenuBarExtra.Submenu icon="github-white.png" title="Create a WP Bones Repository">
          {boilerplates &&
            boilerplates.map((template) =>
              template.slug === "deprecated" ? null : (
                <MenuBarExtra.Item
                  key={template.name}
                  title={template.title}
                  icon={getIcon(template?.icon)}
                  shortcut={template?.shortcut as Keyboard.Shortcut}
                  onAction={() => {
                    open(`https://github.com/new?template_name=${template.name}&template_owner=wpbones`);
                  }}
                />
              ),
            )}
        </MenuBarExtra.Submenu>

        <MenuBarExtra.Item
          title="Open an issue"
          icon={{ source: Icon.Bug, tintColor: Color.Orange }}
          onAction={() => open("https://github.com/wpbones/WPBones/issues")}
        />
        <MenuBarExtra.Item
          title="WP Bones AI"
          icon={{ source: "brand-github-copilot.svg", tintColor: Color.Blue }}
          onAction={() => open("https://wpbones.ownai.com/")}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Community">
        <MenuBarExtra.Item
          icon="brand-discord.svg"
          title="Discord"
          onAction={() => {
            open("https://discord.gg/5bdVyycU8F");
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
