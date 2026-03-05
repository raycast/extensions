import { useEffect, useRef, useState, useCallback } from "react";
import { spawn, ChildProcess } from "child_process";
import { CONTAINER_BIN } from "./container";

const MAX_LINES = 500;

export function useStreamingLogs(name: string, follow: boolean) {
  const [lines, setLines] = useState<string[]>([]);
  const procRef = useRef<ChildProcess | null>(null);
  const bufferRef = useRef("");

  const clear = useCallback(() => setLines([]), []);

  useEffect(() => {
    if (!follow) {
      if (procRef.current) {
        procRef.current.kill();
        procRef.current = null;
      }
      return;
    }

    setLines([]);
    bufferRef.current = "";
    const proc = spawn(CONTAINER_BIN, ["logs", "-f", name]);
    procRef.current = proc;

    const handleData = (chunk: Buffer) => {
      const text = bufferRef.current + chunk.toString();
      const parts = text.split("\n");
      bufferRef.current = parts.pop() || "";

      if (parts.length > 0) {
        setLines((prev) => {
          const updated = [...prev, ...parts];
          return updated.length > MAX_LINES ? updated.slice(updated.length - MAX_LINES) : updated;
        });
      }
    };

    proc.stdout?.on("data", handleData);
    proc.stderr?.on("data", handleData);

    return () => {
      proc.kill();
      procRef.current = null;
      bufferRef.current = "";
    };
  }, [name, follow]);

  return {
    logs: lines.join("\n"),
    isStreaming: follow,
    clear,
  };
}
