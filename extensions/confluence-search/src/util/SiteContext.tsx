import { createContext } from "react";
import { nullSite } from "../api/site";

// In practice will always have a value
export const SiteContext = createContext(nullSite);
