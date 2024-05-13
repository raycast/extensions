import { useExternalThemes } from "./hooks";
import { useEffect, useState } from "react";
import { showFailureToast } from "@raycast/utils";
import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { AlacrittyConfig, ExternalTheme, LocalTheme } from "../../types/theme-switcher";
import { getCurrentTheme, changeTheme, readCurrentConfig } from "../../utils/theme-switcher";

export const ThemeSwitcher = () => {
  const [searchText, setSearchText] = useState("");
  const [isSwitchingTheme, setIsSwitchingTheme] = useState(false);
  const [config, setConfig] = useState<null | AlacrittyConfig>(null);
  const [currentTheme, setCurrentTheme] = useState<null | LocalTheme>(null);
  const { data, isLoading, pagination } = useExternalThemes(searchText);

  useEffect(() => {
    const config = readCurrentConfig();

    setConfig(config);
    setCurrentTheme(getCurrentTheme(config));
  }, []);

  const onSelectTheme = (selected: ExternalTheme) => {
    setIsSwitchingTheme(true);
    return changeTheme(selected, config)
      .then(() => setCurrentTheme(selected))
      .catch((e) => showFailureToast(e, { title: "Failed to change theme" }))
      .finally(() => setIsSwitchingTheme(false));
  };

  return (
    <List
      throttle
      isShowingDetail
      isLoading={isLoading || isSwitchingTheme}
      searchBarPlaceholder="Search Themes..."
      pagination={pagination}
      onSearchTextChange={setSearchText}
    >
      {data?.map((theme) => (
        <ListItem
          data={theme}
          key={theme.filename}
          isCurrentTheme={currentTheme?.basename === theme.basename}
          onSelect={onSelectTheme}
        />
      ))}
    </List>
  );
};

type ListItemProps = {
  data: ExternalTheme;
  isCurrentTheme: boolean;
  onSelect: (theme: ExternalTheme) => void;
};

const ListItem = ({ data, isCurrentTheme, onSelect }: ListItemProps) => (
  <List.Item
    key={data.filename}
    title={data.displayName}
    icon={
      !isCurrentTheme
        ? Icon.Circle
        : {
            source: Icon.CheckCircle,
            tintColor: Color.Green,
          }
    }
    detail={<List.Item.Detail markdown={`# ${data.displayName}\n\n![${data.filename}](${data.imageUrl})`} />}
    actions={
      isCurrentTheme ? null : (
        <ActionPanel>
          <Action title="Select" onAction={() => onSelect(data)} />
        </ActionPanel>
      )
    }
  />
);
