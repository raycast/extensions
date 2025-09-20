import { NodePackageManager, PackageManager } from "./packageMangers";

type EslintPreset = "eslint" | "author-recommended";

export interface BasePerformOpts<T extends PackageManager> {
  manager: T;
  projectRoot: string;
}

export type BaseNodePerformOpts = BasePerformOpts<NodePackageManager>;

export interface InitEslint {
  manager: PackageManager;
  root: string;
  preset?: EslintPreset;
  typescript?: boolean;
}

export type InitReactOpts = Preferences.ProjectReact & BaseNodePerformOpts;
