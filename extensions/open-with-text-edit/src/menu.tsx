import { Icon, MenuBarExtra, launchCommand, LaunchType } from "@raycast/api";
import { opn } from "opn";

export default function Command() {
  return (
    <MenuBarExtra icon={Icon.NewDocument}>
      <MenuBarExtra.Section title="Main">
        <MenuBarExtra.Item
          key={"1"}
          icon={Icon.Document}
          title={"Open File With Text Edit"}
          onAction={() => {
            launchCommand({ name: "index", type: LaunchType.Background });
          }}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Extra">
        <MenuBarExtra.Item
          key={"2"}
          icon={Icon.Globe}
          title={"Suggest a new file extension"}
          onAction={() => {
            opn(
              "https://github.com/raycast/extensions/issues/new?assignees=&labels=extension,feature+request&projects=&template=extension_feature_request.yml&title=[Open With Text Edit] New File Extension Request"
            );
          }}
        />

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
