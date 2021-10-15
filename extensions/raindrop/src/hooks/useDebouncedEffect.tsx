import { useEffect } from "react";

export const useDebouncedEffect = (
    callback: () => any, delay = 250, dependencies?: any[],
) => useEffect(() => {
    const timer = setTimeout(callback, delay);

    return () => {
        clearTimeout(timer);
    };
}, dependencies);