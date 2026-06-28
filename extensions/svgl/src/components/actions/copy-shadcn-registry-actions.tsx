import {
  Action,
  ActionPanel,
  Clipboard,
  getPreferenceValues,
  List,
  LocalStorage,
  openCommandPreferences,
  popToRoot,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { Svg } from "../../type";
import { useSvglExtension } from "../app-context";

const hasInitDefaultPackageManager = async () => {
  return await LocalStorage.getItem<boolean>("has-init-default-package-manager");
};

const CopyShadcnRegistryActions = ({ svg }: { svg: Svg }) => {
  const { push } = useNavigation();
  const { addRecentSvgId } = useSvglExtension();

  const handleAction = async () => {
    addRecentSvgId(svg.id);

    if (!(await hasInitDefaultPackageManager())) {
      push(<InitDefaultPackageManager />);

      return;
    }

    const preferences = getPreferenceValues<Preferences.Index>();
    const { defaultPackageManager } = preferences;

    const baseCommand = `shadcn@latest add @svgl/${svg.title.toLowerCase().replace(/\s+/g, "-")}`;

    const runners: Record<string, string> = {
      pnpm: "pnpm dlx",
      npm: "npx",
      yarn: "yarn",
      bun: "bunx --bun",
    };

    const runner = runners[defaultPackageManager ?? "pnpm"];
    const command = `${runner} ${baseCommand}`;

    Clipboard.copy(command);
    showToast({
      style: Toast.Style.Success,
      title: "Copied shadcn/ui Registry install command to clipboard",
    });
  };

  return (
    <Action
      icon={{
        source: {
          light: "https://svgl.app/library/shadcn-ui.svg",
          dark: "https://svgl.app/library/shadcn-ui_dark.svg",
        },
      }}
      title="Copy Shadcn/ui Registry Install Command"
      onAction={handleAction}
    />
  );
};

const InitDefaultPackageManager = () => {
  const handleAction = async () => {
    openCommandPreferences();
    await LocalStorage.setItem("has-init-default-package-manager", true);
    popToRoot();
  };

  return (
    <List searchBarPlaceholder="Setup Default Package Manager">
      <List.EmptyView
        title="Setup Default Package Manager"
        description="Open Command Preferences to setup the default package manager."
        icon={{
          source: {
            light: "https://svgl.app/library/shadcn-ui.svg",
            dark: "https://svgl.app/library/shadcn-ui_dark.svg",
          },
        }}
        actions={
          <ActionPanel>
            <Action title="Open Command Preferences" onAction={handleAction} />
          </ActionPanel>
        }
      />
    </List>
  );
};

export default CopyShadcnRegistryActions;
