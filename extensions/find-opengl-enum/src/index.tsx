import { List, environment } from "@raycast/api";
import { readFileSync } from "fs";
import path from "path";

enum GLVersion {
  UNKNOWN = "Unknown GL Version",
  GLES20 = "OpenGL(ES) 2.0",
  GLES30 = "OpenGL(ES) 3.0",
  GLES31 = "OpenGL(ES) 3.1",
  GLES32 = "OpenGL(ES) 3.2",

  GLES2_EXT_IOS = "OpenGL(ES) 2.0 Extension(iOS)",
  GLES3_EXT_IOS = "OpenGL(ES) 3.0 Extension(iOS)",
}

class GLEnumInfo {
  public version: GLVersion = GLVersion.UNKNOWN;
  public enumInDeximal: number = 0x0;
  public names: string[] = [];

  private _groups: Map<string, string[]> = new Map();

  constructor(version: GLVersion, enumInDex: number, names: string[]) {
    this.version = version;
    this.enumInDeximal = enumInDex;
    this.names = this.names.concat(names);

    this.rebuildGroups(version, names);
  }

  public getKeywords() {
    const splitStrs = this.names
      .map((name) => name.split("_"))
      .reduce((p, c) => p.concat(c))
      .filter((str) => str !== "GL");

    return this.names
      .concat(this.names.map((n) => n.toLowerCase()))
      .concat(splitStrs)
      .concat(splitStrs.map((str) => str.toLowerCase()))
      .concat([`${this.enumInDeximal}`]); // original enum in deximal
  }

  public getTitle() {
    return `0x${this.enumInDeximal.toString(16).padStart(4, "0").toUpperCase()}`;
  }

  public getOutput() {
    let output = "";
    this._groups.forEach((names, version) => {
      output += `### ${version}\n${names.map((name) => "* " + name).join("\n")}\n`;
    });
    return output;
  }

  public concatInfo(newInfo: GLEnumInfo) {
    this.names = this.names.concat(newInfo.names);
    this.rebuildGroups(newInfo.version, newInfo.names);
  }

  private rebuildGroups(newVer: GLVersion, newNames: string[]) {
    const names = this._groups.get(newVer);

    // version already exists
    if (names) {
      this._groups.set(newVer, names.concat(newNames));
    } else {
      // create new version for group
      this._groups.set(newVer, newNames);
    }
  }
}

export default function Command() {
  const all: Map<string, GLEnumInfo> = new Map();

  function register(all: Map<string, GLEnumInfo>, jsonName: string, version: GLVersion) {
    const entry = JSON.parse(
      readFileSync(path.join(environment.assetsPath, `gles/${jsonName}.json`), { encoding: "utf-8" }),
    ) as [string, string[]];
    Object.entries(entry).forEach((item) => {
      const key = item[0];
      const value = item[1] as string[];

      const newInfo = new GLEnumInfo(version, parseInt(key), value);

      const info = all.get(key);
      if (!info) {
        all.set(key, newInfo);
      } else {
        info.concatInfo(newInfo);
      }
    });
  }

  register(all, "gles-20", GLVersion.GLES20);
  register(all, "gles-30", GLVersion.GLES30);
  register(all, "gles-31", GLVersion.GLES31);
  register(all, "gles-32", GLVersion.GLES32);

  register(all, "ios-ext-gles2", GLVersion.GLES2_EXT_IOS);
  register(all, "ios-ext-gles3", GLVersion.GLES3_EXT_IOS);
  // TODO: register other platform

  return (
    <List isShowingDetail>
      {Array.from(all, ([, info]) => (
        <List.Item
          key={info.enumInDeximal}
          // dex or name
          keywords={info.getKeywords()}
          // hex
          title={info.getTitle()}
          detail={<List.Item.Detail markdown={info.getOutput()} />}
        />
      ))}
    </List>
  );
}
