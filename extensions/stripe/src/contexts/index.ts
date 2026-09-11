import { EnvProps } from "@src/types";
import { createContext } from "react";

export const EnvironmentContext = createContext<undefined | EnvProps>(undefined);

export { ProfileContext, ProfileProvider } from "./profile-context";
