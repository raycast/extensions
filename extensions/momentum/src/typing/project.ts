import { PackageManagerName } from "./packageMangers";

export interface Project extends Omit<Preferences.ProjectEmpty, "pkgManager"> {
  pkgManager: PackageManagerName;
}
