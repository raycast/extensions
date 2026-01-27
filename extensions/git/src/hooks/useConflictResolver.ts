import { useEffect, useState } from "react";
import { ConflictSegment } from "../types";
import { readFileSync, writeFileSync } from "fs";
import { nanoid } from "nanoid";

const MAX_CONTENT_PREVIEW_OFFSET_LINES = 5;

export type ConflictResolveState = {
  segments: ConflictSegment[];
  isLoading: boolean;
  resolveSegment: (segmentId: string, resolution: "current" | "incoming" | null) => void;
  applyResolution: () => void;
};

/**
 * Custom hook for managing conflict resolution in a file.
 *
 * @param filePath - Path to the conflicted file
 * @returns Object containing:
 *   - segments: Array of conflict segments with resolution state
 *   - isLoading: Loading state
 *   - resolveSegment: Function to set resolution for a segment
 *   - applyResolution: Function to write resolved content to file
 */
export function useConflictResolver(filePath: string): ConflictResolveState {
  const [segments, setSegments] = useState<ConflictSegment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const segments = parseConflictedFile(filePath);
    setSegments(segments);
    setIsLoading(false);
  }, [filePath]);

  const resolveSegment = (segmentId: string, resolution: "current" | "incoming" | null) => {
    setSegments((prev) => prev.map((seg) => (seg.id === segmentId ? { ...seg, resolution } : seg)));
  };

  const applyResolution = () => {
    const resolvedContent = applyConflictResolutions(filePath, segments);
    writeFileSync(filePath, resolvedContent, "utf-8");
  };

  return {
    segments,
    isLoading,
    resolveSegment,
    applyResolution,
  };
}

/**
 * Parses a conflicted file and extracts all conflict segments.
 */
function parseConflictedFile(filePath: string): ConflictSegment[] {
  const fileContent = readFileSync(filePath, "utf-8");
  const lines = fileContent.split("\n");
  const segments: ConflictSegment[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Look for conflict start marker
    if (line.startsWith("<<<<<<<")) {
      const startLine = i + 1;
      const currentLabel = line.replace(/^<{7}\s*/, "").trim() || "HEAD";

      // Find the separator
      let separatorIndex = i + 1;
      while (separatorIndex < lines.length && !lines[separatorIndex].startsWith("=======")) {
        separatorIndex++;
      }

      // Find the end marker
      let endIndex = separatorIndex + 1;
      while (endIndex < lines.length && !lines[endIndex].startsWith(">>>>>>>")) {
        endIndex++;
      }

      if (separatorIndex < lines.length && endIndex < lines.length) {
        const currentContent = lines.slice(i + 1, separatorIndex).join("\n");
        const incomingContent = lines.slice(separatorIndex + 1, endIndex).join("\n");
        const incomingLabel = lines[endIndex].replace(/^>{7}\s*/, "").trim() || "incoming";

        const beforeContent = lines
          .slice(Math.max(0, startLine - MAX_CONTENT_PREVIEW_OFFSET_LINES), startLine - 1)
          .join("\n");
        const afterContent = lines
          .slice(endIndex + 1, Math.min(lines.length, endIndex + MAX_CONTENT_PREVIEW_OFFSET_LINES))
          .join("\n");

        segments.push({
          id: nanoid(),
          startLine,
          endLine: endIndex + 1,
          beforeContent,
          afterContent,
          current: {
            label: currentLabel,
            content: currentContent,
          },
          incoming: {
            label: incomingLabel,
            content: incomingContent,
          },
          resolution: null,
        });

        i = endIndex + 1;
      } else {
        i++;
      }
    } else {
      i++;
    }
  }

  return segments;
}

/**
 * Applies conflict resolutions to a file and returns the resolved content.
 */
function applyConflictResolutions(filePath: string, segments: ConflictSegment[]): string {
  const fileContent = readFileSync(filePath, "utf-8");
  const lines = fileContent.split("\n");

  // Build a map of segment IDs to their resolution
  const resolutionMap = new Map<number, ConflictSegment>();
  for (const segment of segments) {
    if (segment.resolution) {
      resolutionMap.set(segment.startLine, segment);
    }
  }

  const resolvedLines: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Look for conflict start marker
    if (line.startsWith("<<<<<<<")) {
      const startLine = i + 1;

      // Find the separator
      let separatorIndex = i + 1;
      while (separatorIndex < lines.length && !lines[separatorIndex].startsWith("=======")) {
        separatorIndex++;
      }

      // Find the end marker
      let endIndex = separatorIndex + 1;
      while (endIndex < lines.length && !lines[endIndex].startsWith(">>>>>>>")) {
        endIndex++;
      }

      if (separatorIndex < lines.length && endIndex < lines.length) {
        const segment = resolutionMap.get(startLine);

        if (segment && segment.resolution) {
          // Apply the resolution
          const resolvedContent = segment.resolution === "current" ? segment.current.content : segment.incoming.content;

          resolvedLines.push(resolvedContent);
        } else {
          // Keep the conflict markers if not resolved
          resolvedLines.push(...lines.slice(i, endIndex + 1));
        }

        i = endIndex + 1;
      } else {
        resolvedLines.push(line);
        i++;
      }
    } else {
      resolvedLines.push(line);
      i++;
    }
  }

  return resolvedLines.join("\n");
}
