import { Action, ActionPanel, Grid } from "@raycast/api";
import { useMemo, useState } from "react";
import { icons } from "@phosphor-icons/core";
import debounce from "lodash/debounce";
import difference from "lodash/difference";
import upperFirst from "lodash/upperFirst";
import { getIconUrl } from "./utils/helpers";

const weights = ["thin", "light", "regular", "bold", "fill", "duotone"];

const SearchIconsCommand = () => {
  const [weight, setWeight] = useState("regular");
  const [search, setSearch] = useState("");

  const filteredIcons = useMemo(() => {
    const queries = search
      .split(" ")
      .filter(Boolean)
      .map((q) => q.toLowerCase());
    if (queries.length === 0) return icons;

    return icons.filter((i) => {
      const searchValues = [...i.tags, ...i.categories].map((s) => s.toLowerCase());
      return (
        difference(queries, searchValues).length === 0 || queries.find((q) => i.pascal_name.toLowerCase().includes(q))
      );
    });
  }, [search]);

  return (
    <Grid
      columns={6}
      inset={Grid.Inset.Large}
      searchBarPlaceholder="Search icons by name, category or tag"
      onSearchTextChange={debounce(setSearch, 1000)}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Select Weight" storeValue={true} defaultValue={weight} onChange={setWeight}>
          {weights.map((type) => (
            <Grid.Dropdown.Item key={type} title={upperFirst(type)} value={type} />
          ))}
        </Grid.Dropdown>
      }
    >
      {filteredIcons.map((i) => {
        const weightText = weight !== "regular" ? `weight="${weight}"` : "";
        const weightClassName = weight !== "regular" ? `ph-${weight}` : "ph";
        return (
          <Grid.Item
            key={i.name}
            title={i.name}
            content={{
              source: getIconUrl(i.name, weight),
              tintColor: { light: "black", dark: "white" },
            }}
            actions={
              <ActionPanel title="Copy to Clipboard">
                <Action.CopyToClipboard
                  title="Copy Name"
                  content={i.name}
                  icon={{
                    source: getIconUrl("clipboard-text", weight),
                    tintColor: { light: "black", dark: "white" },
                  }}
                />
                <Action.CopyToClipboard
                  title="Copy HTML"
                  content={`<i class="${weightClassName} ph-${i.name}"></i>`}
                  icon={{
                    source: getIconUrl("brackets-angle", weight),
                    tintColor: { light: "black", dark: "white" },
                  }}
                />
                <Action.CopyToClipboard
                  title="Copy React"
                  content={`<${i.pascal_name} ${weightText} size={32} />`}
                  icon={{
                    source: getIconUrl("atom", weight),
                    tintColor: { light: "black", dark: "white" },
                  }}
                />
                <Action.CopyToClipboard
                  title="Copy Vue"
                  content={`<ph-${i.name} ${weightText} :size="32" />`}
                  icon={{
                    source: getIconUrl("file-vue", weight),
                    tintColor: { light: "black", dark: "white" },
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
};

export default SearchIconsCommand;
