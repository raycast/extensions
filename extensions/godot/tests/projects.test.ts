import { describe, expect, it } from "vitest";
import {
  abbreviateHome,
  getEngineVersion,
  getKeywords,
  getProjectDataDir,
  getRenderer,
  GodotProject,
  groupProjects,
  isCSharpProject,
  isSupportedIconFile,
  parseProjectList,
  parseProjectSettings,
  resolveResourcePath,
  xmlUnescape,
} from "../src/lib/projects";

const GODOT4_PROJECT = `; Engine configuration file.
; It's best edited using the editor UI and not directly,
; since the parameters that go here are not all obvious.
;
; Format:
;   [section] ; section goes between []
;   param=value ; assign values to parameters

config_version=5

[application]

config/name="Space Shooter"
config/description="A small arcade shooter."
config/tags=PackedStringArray("arcade", "jam")
run/main_scene="uid://cl4ymsdo1rdxx"
config/features=PackedStringArray("4.3", "C#", "Forward Plus")
config/icon="res://icon.svg"

[dotnet]

project/assembly_name="Space Shooter"
`;

const GODOT3_PROJECT = `; Engine configuration file.
config_version=4

_global_script_classes=[ {
"base": "Node",
"class": "Player",
"language": "GDScript",
"path": "res://player.gd"
} ]

[application]

config/name="Old Platformer"
run/main_scene="res://Main.tscn"
config/icon="res://icon.png"
`;

function project(overrides: Partial<GodotProject>): GodotProject {
  return {
    path: "/Users/ada/Projects/example",
    name: "Example",
    favorite: false,
    status: "ok",
    folderExists: true,
    configVersion: 5,
    isCSharp: false,
    tags: [],
    hasImportedAssets: true,
    ...overrides,
  };
}

describe("parseProjectList", () => {
  it("returns every project folder with its favorite flag, in file order", () => {
    const entries = parseProjectList(
      "[/Users/ada/Projects/space-shooter]\n\nfavorite=false\n\n[/Users/ada/Projects/puzzle-garden]\n\nfavorite=true\n\n[/Users/ada/Projects/odd-flag]\n\nfavorite=\"yes\"\n",
    );
    expect(entries).toEqual([
      { path: "/Users/ada/Projects/space-shooter", favorite: false },
      { path: "/Users/ada/Projects/puzzle-garden", favorite: true },
      { path: "/Users/ada/Projects/odd-flag", favorite: false },
    ]);
  });

  it("returns an empty list for an empty file", () => {
    expect(parseProjectList("")).toEqual([]);
  });
});

describe("parseProjectSettings", () => {
  it("reads a Godot 4 project", () => {
    const settings = parseProjectSettings(GODOT4_PROJECT);
    expect(settings).toEqual({
      configVersion: 5,
      name: "Space Shooter",
      description: "A small arcade shooter.",
      icon: "res://icon.svg",
      mainScene: "uid://cl4ymsdo1rdxx",
      features: ["4.3", "C#", "Forward Plus"],
      tags: ["arcade", "jam"],
      hiddenDataDir: true,
    });
    expect(getEngineVersion(settings)).toBe("4.3");
    expect(getRenderer(settings.features)).toBe("Forward Plus");
    expect(isCSharpProject(settings.features)).toBe(true);
    expect(getProjectDataDir(settings)).toBe(".godot");
  });

  it("reads a Godot 3 project and labels it 3.x", () => {
    const settings = parseProjectSettings(GODOT3_PROJECT);
    expect(settings.name).toBe("Old Platformer");
    expect(settings.configVersion).toBe(4);
    expect(getEngineVersion(settings)).toBe("3.x");
    expect(isCSharpProject(settings.features)).toBe(false);
    expect(getProjectDataDir(settings)).toBe(".import");
  });

  it("handles a project without a name, features or config_version", () => {
    const settings = parseProjectSettings("[application]\n");
    expect(settings.name).toBeUndefined();
    expect(settings.configVersion).toBe(0);
    expect(getEngineVersion(settings)).toBeUndefined();
    expect(getRenderer(settings.features)).toBeUndefined();
  });

  it("decodes XML entities in the name, like the Project Manager", () => {
    const settings = parseProjectSettings('config_version=5\n[application]\nconfig/name="Tom &amp; Jerry&#39;s &#x1F3AE;"\n');
    expect(settings.name).toBe("Tom & Jerry's 🎮");
  });

  it("uses the visible data folder when the project asks for it", () => {
    const settings = parseProjectSettings(
      "config_version=5\n[application]\nconfig/use_hidden_project_data_directory=false\n",
    );
    expect(getProjectDataDir(settings)).toBe("godot");
  });
});

describe("helpers", () => {
  it("finds the version feature the way Godot does", () => {
    expect(getEngineVersion({ configVersion: 5, features: ["Mobile", "4.4"] })).toBe("4.4");
    expect(getEngineVersion({ configVersion: 5, features: ["4.10", "GL Compatibility"] })).toBe("4.10");
  });

  it("resolves res:// paths inside the project", () => {
    expect(resolveResourcePath("/Users/ada/Projects/space-shooter", "res://art/icon.png")).toBe(
      "/Users/ada/Projects/space-shooter/art/icon.png",
    );
    expect(resolveResourcePath("/Users/ada/Projects/space-shooter", "/Users/ada/icon.png")).toBe("/Users/ada/icon.png");
    expect(resolveResourcePath("/Users/ada/Projects/space-shooter", "icon.png")).toBeUndefined();
  });

  it("accepts only PNG and SVG icons", () => {
    expect(isSupportedIconFile("/a/icon.svg")).toBe(true);
    expect(isSupportedIconFile("/a/icon.PNG")).toBe(true);
    expect(isSupportedIconFile("/a/icon.webp")).toBe(false);
    expect(isSupportedIconFile("/a/icon.svg.import")).toBe(false);
  });

  it("leaves unknown or broken entities alone", () => {
    expect(xmlUnescape("a &nbsp; b &#0; c")).toBe("a &nbsp; b &#0; c");
  });

  it("shortens paths in the home folder", () => {
    expect(abbreviateHome("/Users/ada/Projects/space-shooter", "/Users/ada")).toBe("~/Projects/space-shooter");
    expect(abbreviateHome("/Users/ada", "/Users/ada")).toBe("~");
    expect(abbreviateHome("/Users/adam/game", "/Users/ada")).toBe("/Users/adam/game");
    expect(abbreviateHome("/Volumes/Games/space-shooter", "/Users/ada")).toBe("/Volumes/Games/space-shooter");
  });
});

describe("getKeywords", () => {
  it("uses the folder names below home and the tags", () => {
    expect(getKeywords({ path: "/Users/ada/Projects/space-shooter", tags: ["jam", "Projects"] }, "/Users/ada")).toEqual([
      "Projects",
      "space-shooter",
      "jam",
    ]);
    expect(getKeywords({ path: "/Volumes/Games/space-shooter", tags: [] }, "/Users/ada")).toEqual([
      "Volumes",
      "Games",
      "space-shooter",
    ]);
  });
});

describe("groupProjects", () => {
  it("puts favorites in their own group and sorts each group by last edit", () => {
    const projects = [
      project({ path: "/p/old", name: "Old", lastModified: 1_000 }),
      project({ path: "/p/fav-old", name: "Fav Old", favorite: true, lastModified: 2_000 }),
      project({ path: "/p/missing", name: "Missing", status: "missing" }),
      project({ path: "/p/new", name: "New", lastModified: 5_000 }),
      project({ path: "/p/fav-new", name: "Fav New", favorite: true, lastModified: 9_000 }),
    ];
    const { favorites, others } = groupProjects(projects);
    expect(favorites.map((item) => item.name)).toEqual(["Fav New", "Fav Old"]);
    expect(others.map((item) => item.name)).toEqual(["New", "Old", "Missing"]);
  });

  it("sorts projects without a date by name", () => {
    const { others } = groupProjects([project({ name: "Beta" }), project({ name: "Alpha" })]);
    expect(others.map((item) => item.name)).toEqual(["Alpha", "Beta"]);
  });
});
