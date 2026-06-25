import { spawn } from "child_process";
import * as path from "path";
import * as fs from "fs";
import {
  showToast,
  Toast,
  getPreferenceValues,
  LocalStorage,
} from "@raycast/api";
import { Game } from "../types";

export async function launchGame(game: Game) {
  const prefs = getPreferenceValues();

  if (!fs.existsSync(game.path)) {
    showToast({
      style: Toast.Style.Failure,
      title: "ROM not found",
      message: game.path,
    });
    return;
  }

  let executable = "";
  let args: string[] = [];

  if (game.core === "mame_executable") {
    if (!prefs.mamePath || !fs.existsSync(prefs.mamePath)) {
      showToast({
        style: Toast.Style.Failure,
        title: "MAME not found",
        message: "Check MAME path in preferences.",
      });
      return;
    }
    const exePath = prefs.mamePath.replace(/^"|"$/g, "").trim();
    const romName = path.parse(game.path).name;
    const romDir = path.dirname(game.path);

    if (process.platform === "darwin" && exePath.endsWith(".app")) {
      executable = "open";
      args = ["-a", exePath, "--args", romName, "-rompath", romDir];
    } else {
      executable = exePath;
      args = [romName, "-rompath", romDir];
    }

    showToast({
      style: Toast.Style.Success,
      title: "Launching (MAME)",
      message: game.name,
    });
  } else if (game.core === "openemu" && process.platform === "darwin") {
    executable = "open";
    const appPath = prefs.openEmuPath
      ? prefs.openEmuPath.replace(/^"|"$/g, "").trim()
      : "OpenEmu";

    if (prefs.openEmuPath && !fs.existsSync(appPath)) {
      showToast({
        style: Toast.Style.Failure,
        title: "OpenEmu not found",
        message: appPath,
      });
      return;
    }

    args = ["-a", appPath, game.path];
    showToast({
      style: Toast.Style.Success,
      title: "Launching (OpenEmu)",
      message: game.name,
    });
  } else if (game.core === "duckstation" && prefs.duckstationPath) {
    const exePath = prefs.duckstationPath.replace(/^"|"$/g, "").trim();
    if (!fs.existsSync(exePath)) {
      showToast({
        style: Toast.Style.Failure,
        title: "DuckStation not found",
        message: "Check DuckStation path in preferences.",
      });
      return;
    }

    if (process.platform === "darwin" && exePath.endsWith(".app")) {
      executable = path.join(exePath, "Contents", "MacOS", "DuckStation");
      args = [game.path];
    } else {
      executable = exePath;
      args = [game.path];
    }
    showToast({
      style: Toast.Style.Success,
      title: "Launching (DuckStation)",
      message: game.name,
    });
  } else if (game.core === "dolphin" && prefs.dolphinPath) {
    const exePath = prefs.dolphinPath.replace(/^"|"$/g, "").trim();
    if (!fs.existsSync(exePath)) {
      showToast({
        style: Toast.Style.Failure,
        title: "Dolphin not found",
        message: "Check Dolphin path in preferences.",
      });
      return;
    }

    if (process.platform === "darwin" && exePath.endsWith(".app")) {
      executable = "open";
      args = ["-a", exePath, "--args", "-b", "-e", game.path];
    } else {
      executable = exePath;
      args = ["-b", "-e", game.path];
    }
    showToast({
      style: Toast.Style.Success,
      title: "Launching (Dolphin)",
      message: game.name,
    });
  } else if (game.core === "pcsx2" && prefs.pcsx2Path) {
    const exePath = prefs.pcsx2Path.replace(/^"|"$/g, "").trim();
    if (!fs.existsSync(exePath)) {
      showToast({
        style: Toast.Style.Failure,
        title: "PCSX2 not found",
        message: "Check PCSX2 path in preferences.",
      });
      return;
    }

    if (process.platform === "darwin" && exePath.endsWith(".app")) {
      executable = "open";
      args = ["-a", exePath, "--args", game.path];
    } else {
      executable = exePath;
      args = [game.path];
    }
    showToast({
      style: Toast.Style.Success,
      title: "Launching (PCSX2)",
      message: game.name,
    });
  } else if (game.core === "ppsspp" && prefs.ppssppPath) {
    const exePath = prefs.ppssppPath.replace(/^"|"$/g, "").trim();
    if (!fs.existsSync(exePath)) {
      showToast({
        style: Toast.Style.Failure,
        title: "PPSSPP not found",
        message: "Check PPSSPP path in preferences.",
      });
      return;
    }

    if (process.platform === "darwin" && exePath.endsWith(".app")) {
      executable = "open";
      args = ["-a", exePath, "--args", game.path];
    } else {
      executable = exePath;
      args = [game.path];
    }
    showToast({
      style: Toast.Style.Success,
      title: "Launching (PPSSPP)",
      message: game.name,
    });
  } else if (prefs.retroarchPath) {
    const cleanPath = prefs.retroarchPath.replace(/^"|"$/g, "").trim();

    if (!fs.existsSync(cleanPath)) {
      showToast({
        style: Toast.Style.Failure,
        title: "RetroArch not found",
        message: prefs.retroarchPath,
      });
      return;
    }

    let defaultCoresDir = "";
    if (cleanPath) {
      defaultCoresDir = path.join(path.dirname(cleanPath), "cores");
      if (
        process.platform === "darwin" &&
        cleanPath.includes("RetroArch.app")
      ) {
        defaultCoresDir = path.join(
          path.dirname(path.dirname(cleanPath)),
          "Resources",
          "cores",
        );
      }
    }

    if (process.platform === "linux") {
      const home = process.env.HOME || "";
      const linuxConfig = path.join(home, ".config", "retroarch", "cores");
      if (fs.existsSync(linuxConfig)) {
        defaultCoresDir = linuxConfig;
      } else if (fs.existsSync("/usr/lib/libretro")) {
        defaultCoresDir = "/usr/lib/libretro";
      }
    }

    const coresDir = prefs.coresPath
      ? prefs.coresPath.replace(/^"|"$/g, "").trim()
      : defaultCoresDir;

    const ext =
      process.platform === "win32"
        ? ".dll"
        : process.platform === "darwin"
          ? ".dylib"
          : ".so";
    const coreFileName = game.core.endsWith(ext)
      ? game.core
      : `${game.core}${ext}`;
    const corePath = path.join(coresDir, coreFileName);

    if (!fs.existsSync(corePath)) {
      showToast({
        style: Toast.Style.Failure,
        title: "Core Missing",
        message: `Cannot find ${coreFileName} in ${coresDir}`,
      });
      return;
    }

    if (process.platform === "darwin" && cleanPath.endsWith(".app")) {
      executable = "open";
      args = ["-a", cleanPath, "--args", "-L", corePath, game.path];
    } else {
      executable = cleanPath;
      args = ["-L", corePath, game.path];
    }
    showToast({
      style: Toast.Style.Success,
      title: "Launching",
      message: game.name,
    });
  } else {
    showToast({
      style: Toast.Style.Failure,
      title: "Emulator not configured",
      message: "Set RetroArch path.",
    });
    return;
  }

  const statsRaw = await LocalStorage.getItem<string>("playStats");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let stats: Record<string, any> = {};

  if (statsRaw) {
    try {
      stats = JSON.parse(statsRaw);
    } catch (e) {
      console.error("Stats parse error during launch", e);
    }
  }

  const parentFolder = path.basename(path.dirname(game.path));
  const rawFileName = path.parse(game.path).name;
  const statKey = `${parentFolder}_${game.console}_${rawFileName}`;

  const currentCount = stats[statKey]?.playCount || 0;
  const previousLastPlayed = stats[statKey]?.lastPlayed;

  const proc = spawn(executable, args, { detached: true, stdio: "ignore" });

  proc.on("error", async (err) => {
    showToast({
      style: Toast.Style.Failure,
      title: "Launch failed",
      message: err.message,
    });

    try {
      const freshStatsRaw = await LocalStorage.getItem<string>("playStats");
      if (freshStatsRaw) {
        const freshStats = JSON.parse(freshStatsRaw);
        if (currentCount === 0) {
          delete freshStats[statKey];
        } else {
          freshStats[statKey] = {
            lastPlayed: previousLastPlayed,
            playCount: currentCount,
          };
        }
        await LocalStorage.setItem("playStats", JSON.stringify(freshStats));
      }
    } catch (e) {
      /* ignore */
    }
  });

  proc.unref();

  stats[statKey] = {
    lastPlayed: new Date().toISOString(),
    playCount: currentCount + 1,
  };

  await LocalStorage.setItem("playStats", JSON.stringify(stats));
}
