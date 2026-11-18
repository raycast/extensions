import { createContext, useContext, useMemo } from "react";

import { StarLine } from "../starline/api";

import type { PropsWithChildren } from "react";

const StarLineContext = createContext<StarLine | null>(null);

export function StarLineProvider({ children }: PropsWithChildren) {
    const starline = useMemo(() => new StarLine(), []);
    return <StarLineContext.Provider value={starline}>{children}</StarLineContext.Provider>;
}

export const useOptionalStarLine = () => useContext(StarLineContext);

export const useStarLine = () => {
    const starline = useOptionalStarLine();
    if (starline === null) {
        throw new Error("useStarLine must be used within a StarLineProvider");
    }

    return starline;
};
