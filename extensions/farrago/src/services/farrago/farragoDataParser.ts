import { Clipboard } from "@raycast/api";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import plist from "plist";
import xml2js from "xml2js";

import { SoundSet, SoundSetTile } from "@/types";
import { expandTilde } from "@/utils/helpers";

export class FarragoDataParser {
  farragoDataDirpath: string;
  lastParsedSets: number | null;

  constructor(options: { farragoDataDir: string }) {
    this.farragoDataDirpath = expandTilde(options.farragoDataDir);
    this.lastParsedSets = null;
  }

  get soundSetsDir() {
    return path.join(this.farragoDataDirpath, "Sound Sets");
  }

  _getSetsFilepaths() {
    if (!fs.existsSync(this.soundSetsDir)) {
      throw new Error("Sound Sets directory does not exist: " + this.soundSetsDir);
    }
    const files = fs.readdirSync(this.soundSetsDir);

    return files.filter((file) => !file.includes(".")).map((file) => path.join(this.soundSetsDir, file));
  }

  _parseSetFile(fp: string): SoundSet {
    let result: SoundSet;

    try {
      // Convert and capture the output as a string
      const xmlString = execSync(`plutil -convert xml1 -o - "${fp}"`, { encoding: "utf8" });

      // Parse the XML string
      const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
      parser.parseString(xmlString, (err) => {
        if (err) {
          throw new Error("Error parsing XML: " + err);
        }

        result = plist.parse(xmlString) as SoundSet;
      });
    } catch (error) {
      throw new Error("Error during conversion: " + error);
    }

    return result!;
  }

  _debugCopyParsedSets() {
    const setsParsed = this.getFreshSetsParsed();
    Clipboard.copy(JSON.stringify(setsParsed, null, 2));
  }

  getFreshSetsParsed() {
    const result = this._getSetsFilepaths().map((fp) => this._parseSetFile(fp));
    this.lastParsedSets = Date.now();
    return result;
  }

  hasUpToDateSets() {
    const lastTimeEdited = this.getLastTimeEdited();
    return this.lastParsedSets && this.lastParsedSets > lastTimeEdited;
  }

  getLastTimeEdited() {
    const files = fs.readdirSync(this.soundSetsDir);
    let lastModifiedTime = 0;

    files.forEach((file) => {
      const filePath = path.join(this.soundSetsDir, file);
      const stat = fs.statSync(filePath);
      if (stat.isFile() && stat.mtimeMs > lastModifiedTime) {
        lastModifiedTime = stat.mtimeMs;
      }
    });

    return lastModifiedTime;
  }

  getFilePathForTile(tile: SoundSetTile) {
    const fileExt = tile.fileName.split(".").at(-1);

    return path.join(this.farragoDataDirpath, "Sound Files", `${tile.fileUUID}.${fileExt}`);
  }
}
