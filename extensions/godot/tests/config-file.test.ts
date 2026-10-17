import { describe, expect, it } from "vitest";
import {
  ConfigParseError,
  getBoolean,
  getNumber,
  getString,
  getStringArray,
  parseConfigFile,
} from "../src/lib/config-file";

describe("parseConfigFile", () => {
  it("reads projects.cfg as Godot writes it", () => {
    const file = parseConfigFile(
      "[/Users/ada/Projects/space-shooter]\n\nfavorite=false\n\n[/Users/ada/Projects/puzzle-garden]\n\nfavorite=true\n",
    );
    expect([...file.keys()]).toEqual(["/Users/ada/Projects/space-shooter", "/Users/ada/Projects/puzzle-garden"]);
    expect(getBoolean(file, "/Users/ada/Projects/space-shooter", "favorite")).toBe(false);
    expect(getBoolean(file, "/Users/ada/Projects/puzzle-garden", "favorite")).toBe(true);
  });

  it("keeps keys before the first section in the empty section", () => {
    const file = parseConfigFile("config_version=5\n\n[application]\n\nconfig/name=\"Space Shooter\"\n");
    expect(getNumber(file, "", "config_version")).toBe(5);
    expect(getString(file, "application", "config/name")).toBe("Space Shooter");
  });

  it("skips comments, including brackets inside them", () => {
    const file = parseConfigFile(
      "; Engine configuration file.\n;   [section] ; section goes between []\n;   param=value ; assign values\n\nconfig_version=5 ; trailing\n",
    );
    expect([...file.keys()]).toEqual([""]);
    expect(getNumber(file, "", "config_version")).toBe(5);
  });

  it("decodes escaped characters in strings", () => {
    const file = parseConfigFile(
      '[a]\nquote="say \\"hi\\""\nlines="one\\ntwo"\nslash="back\\\\slash"\nunicode="caf\\u00e9 \\ud83c\\udfae"\n',
    );
    expect(getString(file, "a", "quote")).toBe('say "hi"');
    expect(getString(file, "a", "lines")).toBe("one\ntwo");
    expect(getString(file, "a", "slash")).toBe("back\\slash");
    expect(getString(file, "a", "unicode")).toBe("café 🎮");
  });

  it("keeps raw UTF-8 text and multi-line strings", () => {
    const file = parseConfigFile('[application]\nconfig/description="Première ligne\nseconde ligne"\n');
    expect(getString(file, "application", "config/description")).toBe("Première ligne\nseconde ligne");
  });

  it("reads PackedStringArray values", () => {
    const file = parseConfigFile('[application]\nconfig/features=PackedStringArray("4.3", "C#", "Forward Plus")\n');
    expect(getStringArray(file, "application", "config/features")).toEqual(["4.3", "C#", "Forward Plus"]);
  });

  it("reads empty arrays and Godot 3 PoolStringArray values", () => {
    const file = parseConfigFile('[a]\nempty=PackedStringArray()\nold=PoolStringArray( "3.5" )\n');
    expect(getStringArray(file, "a", "empty")).toEqual([]);
    expect(getStringArray(file, "a", "old")).toEqual(["3.5"]);
  });

  it("skips dictionaries and objects that span several lines", () => {
    const text = [
      "[input]",
      "",
      "move_left={",
      '"deadzone": 0.5,',
      '"events": [Object(InputEventKey,"resource_local_to_scene":false,"resource_name":"","keycode":0,"physical_keycode":65,"unicode":97,"echo":false,"script":null)',
      "]",
      "}",
      "jump={",
      '"deadzone": 0.5,',
      '"events": []',
      "}",
      "",
      "[rendering]",
      "",
      "textures/canvas_textures/default_texture_filter=0",
      "environment/defaults/default_clear_color=Color(0.1, 0.1, 0.12, 1)",
      "",
    ].join("\n");
    const file = parseConfigFile(text);
    expect([...file.get("input")!.keys()]).toEqual(["move_left", "jump"]);
    expect(getNumber(file, "rendering", "textures/canvas_textures/default_texture_filter")).toBe(0);
    expect(file.get("rendering")?.get("environment/defaults/default_clear_color")).toEqual({
      raw: "Color(0.1, 0.1, 0.12, 1)",
    });
  });

  it("skips typed arrays and keeps reading", () => {
    const file = parseConfigFile('[a]\nlist=Array[String](["x", "y"])\nafter=true\n');
    expect(file.get("a")?.get("list")).toEqual({ raw: 'Array[String](["x", "y"])' });
    expect(getBoolean(file, "a", "after")).toBe(true);
  });

  it("reads strings with brackets and semicolons inside", () => {
    const file = parseConfigFile('[autoload]\nGame="*res://game;[main].gd"\n');
    expect(getString(file, "autoload", "Game")).toBe("*res://game;[main].gd");
  });

  it("reads quoted keys", () => {
    const file = parseConfigFile('[a]\n"key with spaces"="value"\n');
    expect(getString(file, "a", "key with spaces")).toBe("value");
  });

  it("unescapes ] in section names", () => {
    const file = parseConfigFile("[/Users/ada/Projects/[jam\\] entry]\n\nfavorite=true\n");
    expect([...file.keys()]).toEqual(["/Users/ada/Projects/[jam] entry"]);
  });

  it("removes keys set to null, like ConfigFile.set_value()", () => {
    const file = parseConfigFile("[a]\nkept=1\nremoved=null\n");
    expect([...file.get("a")!.keys()]).toEqual(["kept"]);
  });

  it("drops sections without keys, like Godot", () => {
    const file = parseConfigFile("[empty]\n\n[only-null]\nfavorite=null\n[kept]\nfavorite=false\n");
    expect([...file.keys()]).toEqual(["kept"]);
  });

  it("skips comments inside values", () => {
    const file = parseConfigFile(
      '[a]\nlist=PackedStringArray("x", ; "commented out"\n"y")\nmap={ ; a comment with } and "quote\n"k": 1\n}\nafter=true\n',
    );
    expect(getStringArray(file, "a", "list")).toEqual(["x", "y"]);
    expect(getBoolean(file, "a", "after")).toBe(true);
  });

  it("merges a section that appears twice", () => {
    const file = parseConfigFile("[a]\none=1\n[b]\n[a]\ntwo=2\n");
    expect(getNumber(file, "a", "one")).toBe(1);
    expect(getNumber(file, "a", "two")).toBe(2);
  });

  it("ignores a byte order mark", () => {
    const file = parseConfigFile(String.fromCharCode(0xfeff) + "[a]\nkey=true\n");
    expect(getBoolean(file, "a", "key")).toBe(true);
  });

  it("returns an empty result for an empty file", () => {
    expect(parseConfigFile("").size).toBe(0);
  });

  it("reports an unterminated string with its line", () => {
    expect(() => parseConfigFile('[a]\n\nname="broken\n')).toThrow(ConfigParseError);
    expect(() => parseConfigFile('[a]\n\nname="broken\n')).toThrow("Unterminated string on line 3");
  });

  it("reports an unterminated section name", () => {
    expect(() => parseConfigFile("[/Users/ada/Projects/space-shooter\nfavorite=true\n")).toThrow(
      "Unexpected end of file in a section name on line 1",
    );
  });

  it("reports an unknown bare word instead of losing the rest of the file", () => {
    expect(() => parseConfigFile("[x]\nfavorite=bar baz\n[y]\nfavorite=true\n")).toThrow(
      'Unexpected identifier "bar" on line 2',
    );
  });

  it("reports a broken number or Unicode escape", () => {
    expect(() => parseConfigFile("[a]\nsize=12abc\n")).toThrow('Invalid number "12abc"');
    expect(() => parseConfigFile('[a]\nname="\\UFFFFFF"\n')).toThrow(ConfigParseError);
  });

  it("reads the special numbers Godot writes", () => {
    const file = parseConfigFile("[a]\nup=inf\ndown=-inf\nold=inf_neg\n");
    expect(getNumber(file, "a", "up")).toBe(Infinity);
    expect(getNumber(file, "a", "down")).toBe(-Infinity);
    expect(getNumber(file, "a", "old")).toBe(-Infinity);
  });

  it("reports a missing value", () => {
    expect(() => parseConfigFile("[a]\nkey=")).toThrow("Expected a value");
  });

  it("reports an unclosed group", () => {
    expect(() => parseConfigFile("[a]\nkey={\n\"x\": 1\n")).toThrow("Unexpected end of file inside a value on line 2");
  });
});
