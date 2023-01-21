import { Action, ActionPanel, environment, Icon, List } from "@raycast/api";
import { exec } from "child_process";
import { SoundData } from "./types";

export default function Command() {
  const soundData: SoundData[] = [
    {
      title: "Alarm Clock",
      icon: Icon.Alarm,
      value: "alarmClock.wav",
    },
    {
      title: "Dismembered Woodpecker",
      icon: Icon.Bird,
      value: "dismemberedWoodpecker.wav",
    },
    {
      title: "Flute Riff",
      icon: Icon.Music,
      value: "fluteRiff.wav",
    },
    {
      title: "Level Up",
      icon: Icon.Trophy,
      value: "levelUp.wav",
    },
    {
      title: "Piano Chime",
      icon: Icon.Music,
      value: "pianoChime.wav",
    },
    {
      title: "Terminator",
      icon: Icon.BarCode,
      value: "terminator.wav",
    },
    {
      title: "Speak Timer Name",
      icon: Icon.Person,
      value: "speak_timer_name",
    },
  ];

  const playSound = (fileName: string) => {
    let command;
    if (fileName === "speak_timer_name") {
      command = `say "Untitled Timer"`;
    } else {
      const selectedSoundPath = `${environment.assetsPath + "/" + fileName}`;
      command = `afplay "${selectedSoundPath}"`;
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
          title={item.title}
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
