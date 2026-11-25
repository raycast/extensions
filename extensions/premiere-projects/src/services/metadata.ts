import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { VideoDimensions } from "../types";
import { calculateAspectRatio } from "../utils/format";

export interface ProjectMetadata {
  version?: string;
  sequences: string[];
  dimensions?: VideoDimensions;
  frameRate?: string;
  isProductionProject?: boolean;
  productionName?: string;
}

const MAX_DECOMPRESS_BYTES = 15 * 1024 * 1024; // 15 MB limit to protect memory

export function parseProjectXml(xmlContent: string): Omit<ProjectMetadata, "isProductionProject" | "productionName"> {
  const result: Omit<ProjectMetadata, "isProductionProject" | "productionName"> = {
    sequences: [],
  };

  try {
    // 1. Extract Version
    const versionMatch = xmlContent.match(/<PremiereData\s+Version=["']([^"']+)["']/i);
    if (versionMatch && versionMatch[1]) {
      result.version = `v${versionMatch[1]}`;
    }

    // 2. Extract Sequences (linear bounded scan to prevent catastrophic backtracking)
    const sequenceNames = new Set<string>();
    const seqOpenRegex = /<Sequence\b[^>]*>/gi;
    let openMatch: RegExpExecArray | null;
    let count = 0;
    while ((openMatch = seqOpenRegex.exec(xmlContent)) !== null && count < 20) {
      const startIndex = openMatch.index + openMatch[0].length;
      const endIndex = xmlContent.indexOf("</Sequence>", startIndex);
      if (endIndex === -1) break;
      const block = xmlContent.slice(startIndex, Math.min(endIndex, startIndex + 2000));
      const nameMatch = block.match(/<Name>([^<]+)<\/Name>/i);
      if (nameMatch && nameMatch[1]) {
        const name = nameMatch[1].trim();
        if (name && !sequenceNames.has(name)) {
          sequenceNames.add(name);
          count++;
        }
      }
      seqOpenRegex.lastIndex = endIndex + 11;
    }

    if (sequenceNames.size === 0) {
      // Fallback: look for <SequenceName>...</SequenceName>
      const altSeqRegex = /<SequenceName>([^<]+)<\/SequenceName>/gi;
      let altMatch: RegExpExecArray | null;
      while ((altMatch = altSeqRegex.exec(xmlContent)) !== null && count < 20) {
        const name = altMatch[1].trim();
        if (name && !sequenceNames.has(name)) {
          sequenceNames.add(name);
          count++;
        }
      }
    }

    result.sequences = Array.from(sequenceNames);

    // 3. Extract Video Dimensions
    // Format 1: <VideoFrameSize>1920,1080</VideoFrameSize>
    const frameSizeMatch = xmlContent.match(/<VideoFrameSize>(\d+)[,x](\d+)<\/VideoFrameSize>/i);
    if (frameSizeMatch && frameSizeMatch[1] && frameSizeMatch[2]) {
      const w = parseInt(frameSizeMatch[1], 10);
      const h = parseInt(frameSizeMatch[2], 10);
      if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
        result.dimensions = {
          width: w,
          height: h,
          aspectRatio: calculateAspectRatio(w, h),
        };
      }
    } else {
      // Format 2: <FrameSizeHorizontal>1920</FrameSizeHorizontal><FrameSizeVertical>1080</FrameSizeVertical>
      const horizMatch = xmlContent.match(/<FrameSizeHorizontal>(\d+)<\/FrameSizeHorizontal>/i);
      const vertMatch = xmlContent.match(/<FrameSizeVertical>(\d+)<\/FrameSizeVertical>/i);
      if (horizMatch && vertMatch && horizMatch[1] && vertMatch[1]) {
        const w = parseInt(horizMatch[1], 10);
        const h = parseInt(vertMatch[1], 10);
        if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
          result.dimensions = {
            width: w,
            height: h,
            aspectRatio: calculateAspectRatio(w, h),
          };
        }
      }
    }

    // 4. Extract Frame Rate / Timebase
    const timebaseMatch = xmlContent.match(/<Timebase>(\d+)<\/Timebase>/i);
    if (timebaseMatch && timebaseMatch[1]) {
      result.frameRate = `${timebaseMatch[1]} fps`;
    }
  } catch {
    // Graceful fallback on any XML parsing failure
  }

  return result;
}

export async function readProjectMetadata(filePath: string): Promise<ProjectMetadata> {
  const metadata: ProjectMetadata = {
    sequences: [],
  };

  try {
    if (!fs.existsSync(filePath)) {
      return metadata;
    }

    // Check if project lives inside an Adobe Production folder
    const dir = path.dirname(filePath);
    const parentProdset = path.join(dir, ".prodset");
    const parentProdsetAlt = path.join(dir, "production.prodset");
    if (fs.existsSync(parentProdset) || fs.existsSync(parentProdsetAlt)) {
      metadata.isProductionProject = true;
      metadata.productionName = path.basename(dir);
    }

    // Read the first chunk to inspect header magic bytes
    const fd = await fs.promises.open(filePath, "r");
    const headerBuf = Buffer.alloc(10);
    await fd.read(headerBuf, 0, 10, 0);
    await fd.close();

    const isGzip = headerBuf[0] === 0x1f && headerBuf[1] === 0x8b;

    let xmlText = "";
    if (isGzip) {
      const compressedBuffer = await fs.promises.readFile(filePath);
      try {
        const decompressed = zlib.gunzipSync(compressedBuffer, {
          maxOutputLength: MAX_DECOMPRESS_BYTES,
        });
        xmlText = decompressed.toString("utf8");
      } catch {
        // If whole file decompression fails, try slice
        return metadata;
      }
    } else {
      // Uncompressed XML project
      const stats = await fs.promises.stat(filePath);
      const readLength = Math.min(stats.size, 5 * 1024 * 1024);
      const buffer = Buffer.alloc(readLength);
      const openedFd = await fs.promises.open(filePath, "r");
      await openedFd.read(buffer, 0, readLength, 0);
      await openedFd.close();
      xmlText = buffer.toString("utf8");
    }

    const parsed = parseProjectXml(xmlText);
    metadata.version = parsed.version;
    metadata.sequences = parsed.sequences;
    metadata.dimensions = parsed.dimensions;
    metadata.frameRate = parsed.frameRate;
  } catch {
    // Non-blocking fallback
  }

  return metadata;
}
