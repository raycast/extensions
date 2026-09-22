import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { register } from "node:module";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

register("./ts-loader.mjs", import.meta.url);

const execFileAsync = promisify(execFile);
const { parseSubinterfaceBytes } =
  await import("../src/services/platform/windows.ts");

if (process.platform !== "win32") {
  console.log("Skipping Windows Wi-Fi integration test on a non-Windows host.");
} else {
  const { stdout: interfacesOutput } = await execFileAsync("netsh", [
    "wlan",
    "show",
    "interfaces",
  ]);
  const blocks = interfacesOutput
    .split(/(?=(?:^|\r?\n)\s*Name\s*:)/i)
    .filter((block) => /Name\s*:/i.test(block));
  const activeBlock = blocks.find((block) =>
    /State\s*:\s*connected/i.test(block),
  );

  if (!activeBlock) {
    console.log(
      "Skipping Windows Wi-Fi integration test: no connected adapter.",
    );
  } else {
    const interfaceName = activeBlock
      .match(/^\s*Name\s*:\s*(.+)$/m)?.[1]
      ?.trim();
    assert(interfaceName, "Connected Wi-Fi interface should have a name");

    const [{ stdout: v4Out }, { stdout: v6Out }] = await Promise.all([
      execFileAsync("netsh", ["interface", "ipv4", "show", "subinterfaces"]),
      execFileAsync("netsh", ["interface", "ipv6", "show", "subinterfaces"]),
    ]);
    const liveV4 = parseSubinterfaceBytes(v4Out, interfaceName);
    const liveV6 = parseSubinterfaceBytes(v6Out, interfaceName);

    assert(liveV4 || liveV6, "Active Wi-Fi counters should be parseable");
    for (const counters of [liveV4, liveV6].filter(Boolean)) {
      assert(Number.isFinite(counters.bytesIn) && counters.bytesIn >= 0);
      assert(Number.isFinite(counters.bytesOut) && counters.bytesOut >= 0);
    }
    console.log(`Windows Wi-Fi integration test passed for ${interfaceName}.`);
  }

  const helperPath = fileURLToPath(
    new URL("../assets/quick-radios-helper.exe", import.meta.url),
  );
  if (existsSync(helperPath)) {
    const { stdout } = await execFileAsync(helperPath, ["devices"]);
    const devices = JSON.parse(stdout);
    assert(Array.isArray(devices), "Bluetooth helper should return an array");
    for (const device of devices) {
      assert(
        Object.hasOwn(device, "BatteryLevel"),
        "Every helper device should include the optional battery field",
      );
      assert(
        device.BatteryLevel === null ||
          (Number.isInteger(device.BatteryLevel) &&
            device.BatteryLevel >= 0 &&
            device.BatteryLevel <= 100),
        "Reported Bluetooth battery levels should be integers from 0 to 100",
      );
    }
    console.log(
      `Windows Bluetooth helper contract passed for ${devices.length} paired device(s).`,
    );
  }
}
