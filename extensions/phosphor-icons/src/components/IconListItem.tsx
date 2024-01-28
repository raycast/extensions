import { IconEntry } from "@phosphor-icons/core";
import { List, environment } from "@raycast/api";
import path from "path";
import IconActionPanel from "./IconActionPanel";

type IconListItemProps = {
  /**
   * The icon to display.
   */
  icon: IconEntry;

  /**
   * The currently selected weight option.
   */
  selectedWeight: string;
};

export default function IconListItem(props: IconListItemProps) {
  const { icon, selectedWeight } = props;

  const svgPath = path.join(
    environment.supportPath,
    selectedWeight,
    `${icon.name}${selectedWeight !== "regular" ? `-${selectedWeight}` : ``}.svg`,
  );
  const githubURL = `https://github.com/phosphor-icons/core/blob/main/assets/${selectedWeight}/${icon.name}.svg`;

  return (
    <List.Item
      title={icon.name}
      keywords={[...icon.categories, icon.codepoint.toString(), ...icon.tags]}
      icon={{ source: svgPath }}
      actions={<IconActionPanel name={icon.name} codepoint={icon.codepoint} svgPath={svgPath} githubURL={githubURL} />}
    />
  );
}
