import { useEffect, useState } from "react";

export const useMemory = () => {
  const [heap, setHeap] = useState<string>("0 MB");

  useEffect(() => {
    const interval = setInterval(() => {
      const usage = process.memoryUsage().heapUsed / 1024 / 1024;
      setHeap(`${usage.toFixed(0)} MB`);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return heap;
};
