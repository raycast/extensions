import { ComponentName } from "../types/ComponentName";
import * as STYLES_API from "../styles-api";

export const getComponentStyles = (component: ComponentName): null | string[] => {
  const COMPONENT_STYLES = (STYLES_API as any)[component];

  if (!COMPONENT_STYLES || typeof COMPONENT_STYLES !== "object") {
    return null;
  }

  return Object.keys(COMPONENT_STYLES);
};
