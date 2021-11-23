import { execSync } from "child_process";

export function listScreenInfo() {
  const stout = execSync("zsh -l -c 'displayplacer list'");
  const result = stout
    .toString()
    .split("\n")
    .reduce<DisplayPlacerList>(
      (data, line) => {
        const lineAsArray = line.split(": ");
        const value = lineAsArray[1];
        const screenIndex = data.screens.findIndex((s: DisplayPlacerScreen) => s.persistentId === data.currentId);
        switch (lineAsArray[0]) {
          case "Persistent screen id": {
            data.currentId = value;
            data.screens.push({ persistentId: value, resolutions: [] });
            break;
          }
          case "Contextual screen id": {
            data.screens[screenIndex].contextualId = value;
            break;
          }
          case "Type": {
            data.screens[screenIndex].type = value;
            break;
          }
          case "Resolution": {
            data.screens[screenIndex].resolution = value;
            break;
          }
          case "Hertz": {
            data.screens[screenIndex].hertz = value;
            break;
          }
          case "Color Depth": {
            data.screens[screenIndex].colorDepth = value;
            break;
          }
          case "Scaling:on": {
            data.screens[screenIndex].scaling = "on";
            break;
          }
          case "Origin": {
            const subValue = value.split(" - ");
            data.screens[screenIndex].origin = subValue[0];
            if (subValue[1]) {
              data.screens[screenIndex].mainDisplay = true;
            }
            break;
          }
          case "Rotation": {
            const subValue = value.split(" - ");
            data.screens[screenIndex].rotation = subValue[0];
            break;
          }
        }
        const modeMatch = lineAsArray[0].match(/ {2}mode (\d+)/);
        if (modeMatch?.length) {
          // we found a resolution, add to the array

          // first check for current mode
          let current = false;
          if (value.search(/ <-- current mode/) >= 0) {
            current = true;
            value.replace(" <-- current mode", "");
          }

          // now split into other screen attrs
          data.screens[screenIndex].resolutions.push({
            current,
            mode: parseInt(modeMatch[1]),
            res: value.match(/res:(\d+x\d+)/)?.[1],
            colorDepth: value.match(/color_depth:(\d+)/)?.[1],
            scaling: value.match(/scaling:(.+)/)?.[1],
            hz: value.match(/hz:(\d+)/)?.[1],
          });
        }
        if (line.startsWith("displayplacer ")) {
          data.currentCommand = line;
        }
        return data;
      },
      { screens: [], currentCommand: null }
    );

  return result;
}

export function switchSettings(favorite: Favorite) {
  if (!favorite.command) return;
  try {
    execSync(`zsh -l -c '${favorite.command}'`);
  } catch (e: any) {
    let error = true;
    const lines = e.toString().split("\n");
    lines.forEach((line: string) => {
      console.log(line);
      if (line.search(/skipping changes for that screen/)) {
        error = false;
      }
    });

    if (error) throw new Error("Unknown");
  }
}
