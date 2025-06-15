import { EnvProps } from "./../types";
import { createContext } from "react";

export const EnvironmentContext = createContext<undefined | EnvProps>(undefined);
