import { useEffect, useState } from "react";

const toMB = (bytes: number) => (bytes / 1024 / 1024).toFixed(1);

export const useMemory = () => {
  const [heap, setHeap] = useState<string>("0 MB");

  useEffect(() => {
    const interval = setInterval(() => {
      setHeap(`${toMB(process.memoryUsage().heapUsed)} MB`);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return heap;
};
