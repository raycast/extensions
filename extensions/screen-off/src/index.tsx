import { MenuBarExtra, Color } from "@raycast/api";
import { exec, execSync, spawn } from "child_process";
import { useState, useEffect } from "react";

function isCaffeinated(): boolean {
  try {
    execSync("pgrep caffeinate", { encoding: "utf8" });
    return true;
  } catch {
    return false;
  }
}

function caffeinate() {
  const proc = spawn("/usr/bin/caffeinate", ["-di"], {
    detached: true,
    stdio: "ignore",
  });
  proc.unref();
}

function decaffeinate() {
  exec("pkill caffeinate");
}

function turnOffScreen() {
  exec("/usr/bin/pmset displaysleepnow");
}

export default function Command() {
  const [caffeinated, setCaffeinated] = useState(isCaffeinated());

  useEffect(() => {
    setCaffeinated(isCaffeinated());
  }, []);

  const handleScreenOffAndCaffeinate = () => {
    if (!caffeinated) {
      caffeinate();
      setCaffeinated(true);
    }
    turnOffScreen();
  };

  const handleToggleCaffeinate = () => {
    if (caffeinated) {
      decaffeinate();
      setCaffeinated(false);
    } else {
      caffeinate();
      setCaffeinated(true);
    }
  };

  const menuIcon = caffeinated
    ? { source: "moon-filled.svg", tintColor: Color.PrimaryText }
    : { source: "moon-outline.svg", tintColor: Color.PrimaryText };

  return (
    <MenuBarExtra
      icon={menuIcon}
      tooltip={caffeinated ? "Caffeinated" : "Decaffeinated"}
    >
      <MenuBarExtra.Item
        title="Turn Screen Off"
        onAction={handleScreenOffAndCaffeinate}
      />
      <MenuBarExtra.Item
        title={caffeinated ? "Decaffeinate" : "Caffeinate"}
        onAction={handleToggleCaffeinate}
      />
    </MenuBarExtra>
  );
}
