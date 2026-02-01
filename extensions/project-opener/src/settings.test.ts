import {
  describe,
  expect,
  test,
  beforeAll,
  afterAll,
  beforeEach,
} from "bun:test";
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// Mock the settings module functions with a custom path for testing
const TEST_DIR = join(tmpdir(), "project-opener-test-settings");
const TEST_SETTINGS_FILE = join(TEST_DIR, "project-settings.json");

interface ProjectIDE {
  path: string;
  name: string;
}

interface ProjectSettings {
  displayName?: string;
  icon?: string;
  ide?: ProjectIDE;
}

interface SettingsStore {
  [projectPath: string]: ProjectSettings;
}

// Replicate the settings functions with test path
function loadAllSettings(): SettingsStore {
  try {
    if (existsSync(TEST_SETTINGS_FILE)) {
      const data = readFileSync(TEST_SETTINGS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch {
    // Return empty store on error
  }
  return {};
}

function getProjectSettings(projectPath: string): ProjectSettings {
  const store = loadAllSettings();
  return store[projectPath] || {};
}

function saveProjectSettings(
  projectPath: string,
  settings: ProjectSettings,
): void {
  if (!existsSync(TEST_DIR)) {
    mkdirSync(TEST_DIR, { recursive: true });
  }
  const store = loadAllSettings();

  if (!settings.displayName && !settings.icon && !settings.ide) {
    delete store[projectPath];
  } else {
    store[projectPath] = settings;
  }

  writeFileSync(TEST_SETTINGS_FILE, JSON.stringify(store, null, 2));
}

describe("settings", () => {
  beforeAll(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterAll(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  beforeEach(() => {
    // Clear settings file before each test
    if (existsSync(TEST_SETTINGS_FILE)) {
      rmSync(TEST_SETTINGS_FILE);
    }
  });

  describe("loadAllSettings", () => {
    test("returns empty object when no settings file exists", () => {
      const settings = loadAllSettings();
      expect(settings).toEqual({});
    });

    test("loads settings from file", () => {
      const testSettings = {
        "/path/to/project": { displayName: "My Project", icon: "star" },
      };
      writeFileSync(TEST_SETTINGS_FILE, JSON.stringify(testSettings));

      const settings = loadAllSettings();
      expect(settings).toEqual(testSettings);
    });

    test("returns empty object on invalid JSON", () => {
      writeFileSync(TEST_SETTINGS_FILE, "not valid json");
      const settings = loadAllSettings();
      expect(settings).toEqual({});
    });
  });

  describe("getProjectSettings", () => {
    test("returns empty object for unknown project", () => {
      const settings = getProjectSettings("/unknown/project");
      expect(settings).toEqual({});
    });

    test("returns settings for known project", () => {
      const testSettings = {
        "/path/to/project": { displayName: "Custom Name", icon: "rocket" },
      };
      writeFileSync(TEST_SETTINGS_FILE, JSON.stringify(testSettings));

      const settings = getProjectSettings("/path/to/project");
      expect(settings).toEqual({ displayName: "Custom Name", icon: "rocket" });
    });

    test("returns settings with IDE override", () => {
      const testSettings = {
        "/path/to/project": {
          displayName: "Custom Name",
          ide: { path: "/Applications/Xcode.app", name: "Xcode" },
        },
      };
      writeFileSync(TEST_SETTINGS_FILE, JSON.stringify(testSettings));

      const settings = getProjectSettings("/path/to/project");
      expect(settings.ide).toEqual({
        path: "/Applications/Xcode.app",
        name: "Xcode",
      });
    });
  });

  describe("saveProjectSettings", () => {
    test("saves new project settings", () => {
      saveProjectSettings("/new/project", { displayName: "New Project" });

      const saved = JSON.parse(readFileSync(TEST_SETTINGS_FILE, "utf-8"));
      expect(saved["/new/project"]).toEqual({ displayName: "New Project" });
    });

    test("updates existing project settings", () => {
      saveProjectSettings("/project", { displayName: "Original" });
      saveProjectSettings("/project", { displayName: "Updated", icon: "star" });

      const saved = JSON.parse(readFileSync(TEST_SETTINGS_FILE, "utf-8"));
      expect(saved["/project"]).toEqual({
        displayName: "Updated",
        icon: "star",
      });
    });

    test("removes project when settings are empty", () => {
      saveProjectSettings("/project", { displayName: "Test" });
      saveProjectSettings("/project", {});

      const saved = JSON.parse(readFileSync(TEST_SETTINGS_FILE, "utf-8"));
      expect(saved["/project"]).toBeUndefined();
    });

    test("preserves other projects when updating one", () => {
      saveProjectSettings("/project-a", { displayName: "Project A" });
      saveProjectSettings("/project-b", { displayName: "Project B" });

      const saved = JSON.parse(readFileSync(TEST_SETTINGS_FILE, "utf-8"));
      expect(saved["/project-a"]).toEqual({ displayName: "Project A" });
      expect(saved["/project-b"]).toEqual({ displayName: "Project B" });
    });

    test("saves project with IDE override", () => {
      saveProjectSettings("/project", {
        ide: { path: "/Applications/WebStorm.app", name: "WebStorm" },
      });

      const saved = JSON.parse(readFileSync(TEST_SETTINGS_FILE, "utf-8"));
      expect(saved["/project"].ide).toEqual({
        path: "/Applications/WebStorm.app",
        name: "WebStorm",
      });
    });

    test("keeps project with only IDE override", () => {
      saveProjectSettings("/project", {
        ide: { path: "/Applications/Cursor.app", name: "Cursor" },
      });

      const saved = JSON.parse(readFileSync(TEST_SETTINGS_FILE, "utf-8"));
      expect(saved["/project"]).toBeDefined();
    });
  });
});
