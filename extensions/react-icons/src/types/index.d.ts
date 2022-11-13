import { ElementType } from "react";

export type TIconPath =
  | "AntDesignIcons"
  | "BootstrapIcons"
  | "BoxIcons"
  | "CircumIcons"
  | "Devicons"
  | "Feather"
  | "FlatColorIcons"
  | "FontAwesome"
  | "GameIcons"
  | "GithubOcticonsIcons"
  | "GrommetIcons"
  | "Heroicons"
  | "Heroicons2"
  | "IcoMoonFree"
  | "Ionicons4"
  | "Ionicons5"
  | "MaterialDesignIcons"
  | "RemixIcons"
  | "SimpleIcons"
  | "SimpleLineIcons"
  | "TablerIcons"
  | "ThemifyIcons"
  | "Typicons"
  | "VSCodeIcons"
  | "WeatherIcons"
  | "CssGG";

export type Actions =
  | "copyJSX"
  | "copySVG"
  | "copyName"
  | "pasteJSX"
  | "pasteSVG"
  | "pasteName";

export type ActionFunction = (
  name: string,
  IconComponent: ElementType
) => JSX.Element;
