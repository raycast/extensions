import PROPS from "../docgen.json";
import { ComponentName } from "../types/ComponentName";

export const getComponentProps = (component: ComponentName) => PROPS[component].props;
