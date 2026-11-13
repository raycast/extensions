import { UILibrary } from "../types";
import { shadcnLibrary } from "./shadcn-provider";
import { primengLibrary } from "./primeng-provider";
import { materialLibrary } from "./material-provider";
import { spartanLibrary } from "./spartan-provider";
import { taigaLibrary } from "./taiga-provider";
import { mantineLibrary } from "./mantine-provider";
import { reactSpectrumLibrary } from "./react-spectrum-provider";
import { chakraLibrary } from "./chakra-provider";

/** All registered UI library providers, in display order */
export const libraries: UILibrary[] = [
  shadcnLibrary,
  primengLibrary,
  materialLibrary,
  spartanLibrary,
  taigaLibrary,
  mantineLibrary,
  reactSpectrumLibrary,
  chakraLibrary,
];

/** Lookup a library by its id */
export function getLibrary(id: string): UILibrary | undefined {
  return libraries.find((lib) => lib.id === id);
}
