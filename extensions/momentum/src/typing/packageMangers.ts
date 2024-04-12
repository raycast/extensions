import { Shell } from "zx";

export type NodePackageManagerName = "npm" | "yarn" | "bun" | "pnpm";
export type PythonPackageManager = "poetry" | "pip" | "pip3";
export type GoPackageManager = "go";
export type PackageManagerName = NodePackageManagerName | GoPackageManager | PythonPackageManager;

export interface ProjectInstallOpts {
  root: string;
  packageName: string;
  dev?: boolean;
  global?: boolean;
}

export interface ProjectInitOpts {
  root: string;
}

export interface NodeProjectCreateOpts {
  bundler: string;
  projectName: string;
  root: string;
  template: string;
}

export interface CheckPageOpts {
  pkgName: string;
  global?: boolean;
  root?: string;
}

export interface PackageManager {
  name: PackageManagerName;

  install: (opts: ProjectInstallOpts) => Promise<void>;
  init: (opts: ProjectInitOpts) => Promise<void>;
  isInstalled: () => Promise<boolean>;
  checkPackage: (opts: CheckPageOpts) => Promise<boolean>;
  underlyingShell?: Shell;
}

export interface NodePackageManager extends PackageManager {
  name: NodePackageManagerName;
  create: (opts: NodeProjectCreateOpts) => Promise<void>;
}

export interface PackageManagerSpecs {
  installCommand?: "install" | "add";
  initCommand?: "init"; // FIXME: if this comment stays, most likely no package manager had anything other than init

  globalFlag?: string;
  devFlag?: string;
}

export interface NodePackageManagerSpecs extends PackageManagerSpecs {
  createCommand?: "create";

  templateArg?: string[];
}
