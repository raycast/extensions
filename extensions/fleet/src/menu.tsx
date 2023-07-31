import { Icon, MenuBarExtra, launchCommand, LaunchType, open, showHUD } from "@raycast/api";

export default function Command() {
  return (
    <MenuBarExtra icon={Icon.NewDocument}>
      <MenuBarExtra.Section title="Main">
        <MenuBarExtra.Item
          key={"1"}
          icon={Icon.Document}
          title={"Open File / Directory With Fleet"}
          onAction={async () => {
            try {
              await launchCommand({ name: "index", type: LaunchType.Background });
            } catch (error) {
              console.error(error);
              await showHUD("❌ Failed to launch command");
            }
          }}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Extra">
        <MenuBarExtra.Item
          key={"3"}
          icon={Icon.Heart}
          title={"Made with ❤️ by EliasK"}
          onAction={() => {
            open("https://raycast.com/Ek217");
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
