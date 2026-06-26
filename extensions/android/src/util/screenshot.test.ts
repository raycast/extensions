import { describe, test } from "node:test";
import { expect } from "./expect";
import {
  parseConnectedDevices,
  connectedDeviceLabel,
  screenshotFilename,
  pngDimensions,
  parseCaptureOutput,
  formatBytes,
  buildCaptureCommand,
  buildSaveDialogCommand,
  toFileUrl,
  screenshotMarkdown,
} from "./screenshot";

// Captured verbatim from `adb devices -l` against a connected physical device.
const REAL_SINGLE_DEVICE = `List of devices attached
00145153G001187        device usb:0-1.2 product:AsteroidsEEA model:A059 device:Asteroids transport_id:1
`;

// A realistic multi-device listing: a running emulator, a physical device, and
// two unusable states (offline / unauthorized) that must be excluded.
const MIXED_DEVICES = `List of devices attached
emulator-5554          device product:sdk_gphone64_arm64 model:sdk_gphone64_arm64 device:emu64a transport_id:2
00145153G001187        device usb:0-1.2 product:AsteroidsEEA model:A059 device:Asteroids transport_id:1
emulator-5556          offline
ZY223UABCD             unauthorized
`;

describe("parseConnectedDevices", () => {
  test("Given a real single-device listing, When parsed, Then the serial and model are captured", () => {
    expect(parseConnectedDevices(REAL_SINGLE_DEVICE)).toEqual([
      { serial: "00145153G001187", model: "A059" },
    ]);
  });

  test("Given a mixed listing, When parsed, Then only ready devices are returned in order", () => {
    expect(parseConnectedDevices(MIXED_DEVICES)).toEqual([
      { serial: "emulator-5554", model: "sdk_gphone64_arm64" },
      { serial: "00145153G001187", model: "A059" },
    ]);
  });

  test("Given no attached devices, When parsed, Then returns an empty list", () => {
    expect(parseConnectedDevices("List of devices attached\n\n")).toEqual([]);
  });
});

describe("connectedDeviceLabel", () => {
  const emulators = [{ id: "emulator-5554", name: "Pixel_7_API_34" }];

  test("Given an emulator serial, When labeling, Then the friendly AVD name wins", () => {
    expect(
      connectedDeviceLabel(
        { serial: "emulator-5554", model: "sdk_gphone64_arm64" },
        emulators
      )
    ).toBe("Pixel_7_API_34");
  });

  test("Given a physical device with a model, When labeling, Then the model is used", () => {
    expect(
      connectedDeviceLabel(
        { serial: "00145153G001187", model: "A059" },
        emulators
      )
    ).toBe("A059");
  });

  test("Given no model and no emulator match, When labeling, Then the serial is used", () => {
    expect(connectedDeviceLabel({ serial: "XYZ123" }, emulators)).toBe(
      "XYZ123"
    );
  });
});

describe("screenshotFilename", () => {
  test("Given a date, When building a filename, Then it is a zero-padded timestamped PNG", () => {
    // June is month index 5; single-digit fields must be zero-padded.
    expect(screenshotFilename(new Date(2026, 5, 8, 9, 4, 5))).toBe(
      "Screenshot_2026-06-08_09-04-05.png"
    );
  });
});

describe("pngDimensions", () => {
  // The exact 24-byte PNG signature + IHDR header captured from a real capture
  // (1080 x 2392): width = 0x00000438, height = 0x00000958.
  const HEADER = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x04, 0x38, 0x00, 0x00, 0x09, 0x58,
  ]);

  test("Given a real PNG header, When reading dimensions, Then width and height are decoded", () => {
    expect(pngDimensions(HEADER)).toEqual({ width: 1080, height: 2392 });
  });

  test("Given a non-PNG buffer, When reading dimensions, Then undefined is returned", () => {
    expect(pngDimensions(Buffer.from("not a png at all"))).toBeUndefined();
  });
});

describe("parseCaptureOutput", () => {
  test("Given real capture stdout, When parsed, Then the written path is extracted", () => {
    expect(parseCaptureOutput("Screenshot written to /tmp/shot.png\n")).toBe(
      "/tmp/shot.png"
    );
  });

  test("Given stdout without a written path, When parsed, Then undefined is returned", () => {
    expect(parseCaptureOutput("some unexpected error\n")).toBeUndefined();
  });
});

describe("formatBytes", () => {
  test("Given a byte count, When formatting, Then a human-readable size is produced", () => {
    expect(formatBytes(500)).toBe("500 B");
    expect(formatBytes(33367)).toBe("32.6 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});

describe("buildCaptureCommand", () => {
  test("Given a cli, serial and output path, When building, Then ANDROID_SERIAL targets the device and args are quoted", () => {
    expect(
      buildCaptureCommand(
        "/usr/local/bin/android",
        "emulator-5554",
        "/tmp/a b.png"
      )
    ).toBe(
      "ANDROID_SERIAL='emulator-5554' '/usr/local/bin/android' screen capture -o '/tmp/a b.png'"
    );
  });
});

describe("buildSaveDialogCommand", () => {
  test("Given a default name, When building, Then an osascript save dialog command is produced", () => {
    expect(buildSaveDialogCommand("Screenshot_2026-06-08_09-04-05.png")).toBe(
      `osascript -e 'POSIX path of (choose file name with prompt "Save screenshot as" default name "Screenshot_2026-06-08_09-04-05.png")'`
    );
  });
});

describe("toFileUrl / screenshotMarkdown", () => {
  test("Given a path with spaces, When building a file URL, Then segments are percent-encoded", () => {
    expect(toFileUrl("/Users/me/My Shots/a.png")).toBe(
      "file:///Users/me/My%20Shots/a.png"
    );
  });

  test("Given a path, When building markdown, Then it embeds the image as a file URL", () => {
    expect(screenshotMarkdown("/tmp/shot.png")).toBe(
      "![Screenshot](file:///tmp/shot.png)"
    );
  });
});
