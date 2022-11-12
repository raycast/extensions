import fs from "fs";
import path from "path";
import { renderToStaticMarkup } from "react-dom/server";
import * as AntDesignIcons from "react-icons/ai";
import * as BoxIcons from "react-icons/bi";
import * as BootstrapIcons from "react-icons/bs";
import * as CssGG from "react-icons/cg";
import * as CircumIcons from "react-icons/ci";
import * as Devicons from "react-icons/di";
import * as FontAwesome from "react-icons/fa";
import * as FlatColorIcons from "react-icons/fc";
import * as Feather from "react-icons/fi";
import * as GameIcons from "react-icons/gi";
import * as GithubOcticonsIcons from "react-icons/go";
import * as GrommetIcons from "react-icons/gr";
import * as Heroicons from "react-icons/hi";
import * as Heroicons2 from "react-icons/hi2";
import * as IcoMoonFree from "react-icons/im";
import * as Ionicons4 from "react-icons/io";
import * as Ionicons5 from "react-icons/io5";
import { IconType } from "react-icons/lib";
import * as MaterialDesignIcons from "react-icons/md";
import * as RemixIcons from "react-icons/ri";
import * as SimpleIcons from "react-icons/si";
import * as SimpleLineIcons from "react-icons/sl";
import * as TablerIcons from "react-icons/tb";
import * as ThemifyIcons from "react-icons/tfi";
import * as Typicons from "react-icons/ti";
import * as VSCodeIcons from "react-icons/vsc";
import * as WeatherIcons from "react-icons/wi";
import { TIconPath } from "../types";

const icons = {
  AntDesignIcons: AntDesignIcons,
  BootstrapIcons: BootstrapIcons,
  BoxIcons: BoxIcons,
  CircumIcons: CircumIcons,
  Devicons: Devicons,
  Feather: Feather,
  FlatColorIcons: FlatColorIcons,
  FontAwesome: FontAwesome,
  GameIcons: GameIcons,
  GithubOcticonsIcons: GithubOcticonsIcons,
  GrommetIcons: GrommetIcons,
  Heroicons: Heroicons,
  Heroicons2: Heroicons2,
  IcoMoonFree: IcoMoonFree,
  Ionicons4: Ionicons4,
  Ionicons5: Ionicons5,
  MaterialDesignIcons: MaterialDesignIcons,
  RemixIcons: RemixIcons,
  SimpleIcons: SimpleIcons,
  SimpleLineIcons: SimpleLineIcons,
  TablerIcons: TablerIcons,
  ThemifyIcons: ThemifyIcons,
  Typicons: Typicons,
  VSCodeIcons: VSCodeIcons,
  WeatherIcons: WeatherIcons,
  CssGG: CssGG,
};

const paths: Record<TIconPath, string> = {
  AntDesignIcons: path.join(__dirname, "../../assets/AntDesignIcons"),
  BootstrapIcons: path.join(__dirname, "../../assets/BootstrapIcons"),
  BoxIcons: path.join(__dirname, "../../assets/BoxIcons"),
  CircumIcons: path.join(__dirname, "../../assets/CircumIcons"),
  Devicons: path.join(__dirname, "../../assets/Devicons"),
  Feather: path.join(__dirname, "../../assets/Feather"),
  FlatColorIcons: path.join(__dirname, "../../assets/FlatColorIcons"),
  FontAwesome: path.join(__dirname, "../../assets/FontAwesome"),
  GameIcons: path.join(__dirname, "../../assets/GameIcons"),
  GithubOcticonsIcons: path.join(__dirname, "../../assets/GithubOcticonsIcons"),
  GrommetIcons: path.join(__dirname, "../../assets/GrommetIcons"),
  Heroicons: path.join(__dirname, "../../assets/Heroicons"),
  Heroicons2: path.join(__dirname, "../../assets/Heroicons2"),
  IcoMoonFree: path.join(__dirname, "../../assets/IcoMoonFree"),
  Ionicons4: path.join(__dirname, "../../assets/Ionicons4"),
  Ionicons5: path.join(__dirname, "../../assets/Ionicons5"),
  MaterialDesignIcons: path.join(__dirname, "../../assets/MaterialDesignIcons"),
  RemixIcons: path.join(__dirname, "../../assets/RemixIcons"),
  SimpleIcons: path.join(__dirname, "../../assets/SimpleIcons"),
  SimpleLineIcons: path.join(__dirname, "../../assets/SimpleLineIcons"),
  TablerIcons: path.join(__dirname, "../../assets/TablerIcons"),
  ThemifyIcons: path.join(__dirname, "../../assets/ThemifyIcons"),
  Typicons: path.join(__dirname, "../../assets/Typicons"),
  VSCodeIcons: path.join(__dirname, "../../assets/VSCodeIcons"),
  WeatherIcons: path.join(__dirname, "../../assets/WeatherIcons"),
  CssGG: path.join(__dirname, "../../assets/CssGG"),
};

async function main() {
  for (const [iconName, iconComponents] of Object.entries(icons)) {
    const iconPath = paths[iconName as TIconPath];
    if (fs.existsSync(iconPath)) {
      await fs.promises.rm(iconPath, { recursive: true });
    }

    for (const [name, IconComponent] of Object.entries<IconType>(iconComponents)) {
      if (name !== "default") {
        await fs.promises.mkdir(iconPath, { recursive: true });
        await fs.promises.writeFile(path.join(iconPath, `${name}.svg`), renderToStaticMarkup(<IconComponent />));
      }
    }
  }
}

main();
