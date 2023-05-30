import { Icon, MenuBarExtra, getPreferenceValues, open } from "@raycast/api";
import { useAtom } from "jotai";
import { dataAtom, activeIdAtom } from "./common/atoms";
import { exec } from "child_process";

export default function Command() {
  const [ACTIVEID, SetActiveId] = useAtom(activeIdAtom);
  const [DATA, SetData] = useAtom(dataAtom);

  const defCom = <MenuBarExtra title="No Task" icon={Icon.Moon} />;

  if (ACTIVEID == "") {
    return defCom;
  }

  const d = JSON.parse(JSON.stringify(DATA));

  for (const i in d) {
    if (d[i].id == ACTIVEID) {
      const s = Math.ceil(new Date().getTime() / 1000);
      d[i].sec = Number(d[i].sec) + (s - Number(d[i].ts));
      d[i].ts = s;
      SetData(d);
      const min = Math.floor(d[i].sec / 60);
      const remainder = Number(d[i].duration) - min;
      if (remainder <= 0) {
        SetActiveId("");
        const pef = getPreferenceValues<Preferences>();
        if (pef.sound) {
          exec(`afplay /System/Library/Sounds/${pef.sound}.aiff -v 10 && $$`);
        }
        if (pef.confetti) {
          open("raycast://extensions/raycast/raycast/confetti");
        }
        return defCom;
      }
      const taskIcon: Icon = d[i].icon as Icon;
      return <MenuBarExtra title={d[i].title + ": " + remainder} icon={taskIcon} />;
    }
  }
  return defCom;
}
