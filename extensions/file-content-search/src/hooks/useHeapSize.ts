import { useEffect, useState } from "react";

type HeapInfo = {
  used: string;
  total: string;
  raw: NodeJS.MemoryUsage;
};

/**
 * A debug hook to monitor heap memory usage in real-time.
 * Logs memory usage to console at specified intervals.
 * @param interval - Polling interval in milliseconds (default: 1000ms)
 * @returns HeapInfo object containing used/total memory in MB and raw MemoryUsage data
 * @remarks Only use in development - remove for production builds
 */
export const useHeapSize = (interval = 1000): HeapInfo => {
  const [heap, setHeap] = useState(process.memoryUsage());

  useEffect(() => {
    const timer = setInterval(() => {
      const usage = process.memoryUsage();
      setHeap(usage);
      console.log(`[Heap] ${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    }, interval);

    return () => clearInterval(timer);
  }, [interval]);

  return {
    used: (heap.heapUsed / 1024 / 1024).toFixed(2),
    total: (heap.heapTotal / 1024 / 1024).toFixed(2),
    raw: heap,
  };
};
