import { Icon, MenuBarExtra, launchCommand, LaunchType } from "@raycast/api";
import { opn } from "opn";

export default function Command() {
  return (
    <MenuBarExtra icon={Icon.NewDocument}>
      <MenuBarExtra.Section title="Main">
        <MenuBarExtra.Item
          key={"1"}
          icon={Icon.Document}
          title={"Open File / Directory With Fleet"}
          onAction={() => {
            launchCommand({ name: "index", type: LaunchType.Background });
          }}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Extra">
        <MenuBarExtra.Item
          key={"3"}
          icon={Icon.Heart}
          title={"Made with ❤️ by EliasK"}
          onAction={() => {
            opn("https://raycast.com/Ek217");
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
