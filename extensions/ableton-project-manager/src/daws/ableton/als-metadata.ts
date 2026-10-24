import fs from "node:fs";
import { createGunzip } from "node:zlib";
import { StringDecoder } from "node:string_decoder";
import { SaxesParser } from "saxes";

export type AlsMetadata = {
  bpm: number | null;
  timeSignature: string | null;
  key: string | null;
  inKey: boolean | null;
};

const ROOT_NOTES = ["C", "C♯/D♭", "D", "E♭", "E", "F", "F♯/G♭", "G", "A♭", "A", "B♭", "B"];

// Ableton 音阶下拉的顺序;不在表里的序号会优雅降级成 "Scale N"
const SCALE_NAMES = ["Major", "Minor", "Dorian", "Mixolydian", "Lydian", "Phrygian", "Locrian"];

function emptyMetadata(): AlsMetadata {
  return {
    bpm: null,
    timeSignature: null,
    key: null,
    inKey: null,
  };
}

function parseNumber(value: unknown): number | null {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function makeKey(root: number | null, scaleIndex: number | null): string | null {
  if (root === null || !Number.isInteger(root) || root < 0 || root > 11 || scaleIndex === null) {
    return null;
  }

  const scaleName = SCALE_NAMES[scaleIndex] ?? `Scale ${scaleIndex}`;
  return `${ROOT_NOTES[root]} ${scaleName}`;
}

function decodeTimeSignature(value: number): string | null {
  if (!Number.isInteger(value) || value < 0) {
    return null;
  }

  const numerator = (value % 99) + 1;
  const denominatorExponent = Math.floor(value / 99);

  if (denominatorExponent > 6) {
    return null;
  }

  return `${numerator}/${2 ** denominatorExponent}`;
}

export function getAlsMetadata(filePath: string): Promise<AlsMetadata> {
  return new Promise((resolve) => {
    const result = emptyMetadata();
    const stack: string[] = [];
    const decoder = new StringDecoder("utf8");
    const parser = new SaxesParser();

    let root: number | null = null;
    let scaleIndex: number | null = null;
    let manualTimeSignature: string | null = null;
    let firstAutomationTimeSignature: string | null = null;
    let insideGlobalTimeSignature = false;
    let insideGlobalScale = false;
    let completed = false;

    const input = fs.createReadStream(filePath);
    const gunzip = createGunzip();

    const finish = (metadata: AlsMetadata) => {
      if (completed) {
        return;
      }

      completed = true;
      resolve(metadata);
    };

    const fail = (error: unknown) => {
      if (completed) {
        return;
      }

      console.error(`[Ableton Project Manager] Failed to parse ALS: ${filePath}`, error);
      finish(emptyMetadata());
      input.destroy();
      gunzip.destroy();
    };

    parser.on("opentag", (tag) => {
      stack.push(tag.name);

      const attributes = tag.attributes as Record<string, unknown>;
      const value = attributes.Value;

      const insideMainTrack = stack.includes("MainTrack") || stack.includes("MasterTrack");
      const insideTempo = insideMainTrack && stack.includes("Tempo");

      const isGlobalScaleOpen =
        stack.length === 3 && stack[0] === "Ableton" && stack[1] === "LiveSet" && tag.name === "ScaleInformation";

      const isGlobalInKey =
        stack.length === 3 && stack[0] === "Ableton" && stack[1] === "LiveSet" && tag.name === "InKey";

      const isGlobalTimeSignature =
        insideMainTrack && stack.includes("DeviceChain") && stack.includes("Mixer") && tag.name === "TimeSignature";

      if (isGlobalScaleOpen) {
        insideGlobalScale = true;
      }

      if (isGlobalTimeSignature) {
        insideGlobalTimeSignature = true;
      }

      if (insideTempo && tag.name === "Manual" && result.bpm === null) {
        const bpm = parseNumber(value);

        if (bpm !== null && bpm > 0) {
          result.bpm = bpm;
        }
      }

      if (insideTempo && tag.name === "FloatEvent" && result.bpm === null && attributes.Time === "-1") {
        const bpm = parseNumber(value);

        if (bpm !== null && bpm > 0) {
          result.bpm = bpm;
        }
      }

      if (insideGlobalTimeSignature && tag.name === "Manual") {
        const encoded = parseNumber(value);

        if (encoded !== null) {
          manualTimeSignature = decodeTimeSignature(encoded);
        }
      }

      if (insideGlobalTimeSignature && tag.name === "EnumEvent") {
        const encoded = parseNumber(value);

        if (encoded !== null && firstAutomationTimeSignature === null) {
          firstAutomationTimeSignature = decodeTimeSignature(encoded);
        }
      }

      if (insideGlobalScale && tag.name === "Root") {
        root = parseNumber(value);
      }

      if (insideGlobalScale && tag.name === "Name") {
        scaleIndex = parseNumber(value);
      }

      if (isGlobalInKey) {
        if (value === "true") {
          result.inKey = true;
        } else if (value === "false") {
          result.inKey = false;
        }
      }
    });

    parser.on("closetag", (tag) => {
      if (tag.name === "TimeSignature" && insideGlobalTimeSignature) {
        insideGlobalTimeSignature = false;
      }

      if (tag.name === "ScaleInformation" && insideGlobalScale) {
        insideGlobalScale = false;
      }

      stack.pop();
    });

    parser.on("error", fail);
    input.on("error", fail);
    gunzip.on("error", fail);

    gunzip.on("data", (chunk: Buffer) => {
      if (completed) {
        return;
      }

      try {
        parser.write(decoder.write(chunk));
      } catch (error) {
        fail(error);
      }
    });

    gunzip.on("end", () => {
      if (completed) {
        return;
      }

      try {
        parser.write(decoder.end());
        parser.close();

        result.timeSignature = manualTimeSignature ?? firstAutomationTimeSignature;
        result.key = makeKey(root, scaleIndex);

        finish(result);
      } catch (error) {
        fail(error);
      }
    });

    input.pipe(gunzip);
  });
}
