import { Action, ActionPanel, environment, getPreferenceValues, List } from "@raycast/api";
import { exec } from "child_process";
import { Preferences } from "./backend/types";
import { soundData } from "./backend/soundData";

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();

  const playSound = (fileName: string) => {
    let command;
    if (fileName === "speak_timer_name") {
      command = `say "Untitled Timer"`;
    } else {
      const selectedSoundPath = `${environment.assetsPath + "/" + fileName}`;
      command = `afplay "${selectedSoundPath}" --volume ${prefs.volumeSetting.replace(",", ".")}`;
    }
    exec(command, (error, stderr) => {
      if (error) {
        console.log(`error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.log(`stderr: ${stderr}`);
        return;
      }
    });
  };

  return (
    <List>
      {soundData.map((item, index) => (
        <List.Item
          key={index}
          icon={item.icon}
          title={item.value === prefs.selectedSound ? `${item.title} (currently selected)` : item.title}
          actions={
            <ActionPanel>
              <Action title="Play Sound" onAction={() => playSound(item.value)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
