import { useEffect, useState } from "react";
import { Icon, MenuBarExtra } from "@raycast/api";
import { runYabaiCommand } from "./helpers/scripts";
import { focusSpace } from "./focus-space";

interface IDesktop {
  index: number;
  label: string;
  "is-visible": boolean;
}

async function getDesktopList(): Promise<IDesktop[]> {
  const desktopList = await runYabaiCommand("-m query --spaces --display");
  if (desktopList.stdout) {
    return JSON.parse(desktopList.stdout);
  }
  throw new Error(desktopList.stderr);
}

const useDesktop = () => {
  const [state, setState] = useState<{ desktop: string; desktopList: IDesktop[]; isLoading: boolean }>({
    desktop: "0",
    desktopList: [],
    isLoading: true,
  });
  useEffect(() => {
    (async () => {
      const { stdout } = await runYabaiCommand("-m signal --list");
      const list = JSON.parse(stdout) as { event: string; action: string }[];
      const action =
        "nohup open -g raycast://extensions/krzysztoff1/yabai/screens-menu-bar?launchType=background > /dev/null 2>&1 &";
      if (list.filter((f) => f.event === "space_changed" && f.action === action).length == 0) {
        runYabaiCommand(`-m signal --add event=space_changed action="${action}"`, { shell: true });
      }
      const desktopList = await getDesktopList();
      const desktop = desktopList.filter((f) => f["is-visible"])[0];
      setState({
        desktop: desktop.label || desktop.index.toString(),
        desktopList,
        isLoading: false,
      });
    })();
  }, []);
  return state;
};
export default function Command() {
  const { desktop, desktopList, isLoading } = useDesktop();
  const icon = Icon.Desktop;

  return (
    <MenuBarExtra title={`${desktop}`} icon={icon} isLoading={isLoading}>
      {desktopList?.map((item) => (
        <MenuBarExtra.Item
          key={item.index}
          title={item.label || item.index.toString()}
          onAction={() => focusSpace(item.index)}
        />
      ))}
    </MenuBarExtra>
  );
}
