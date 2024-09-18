#!/usr/bin.env zx
import {
  CheckPageOpts,
  NodePackageManager,
  NodePackageManagerName,
  NodePackageManagerSpecs,
  NodeProjectCreateOpts,
  PackageManager,
  PackageManagerName,
  PackageManagerSpecs,
  ProjectInitOpts,
  ProjectInstallOpts,
} from "../typing/packageMangers";
import { showToast, Toast } from "@raycast/api";
import { $ } from "./shell";
import fs from "fs/promises";
import { showError, showLoading } from "./toasts";

const defaultSpecs: PackageManagerSpecs = {
  installCommand: "install",
  initCommand: "init",
  devFlag: "-D",
  globalFlag: "-g",
};

const packageManager = (name: PackageManagerName, specs: PackageManagerSpecs = defaultSpecs): PackageManager => {
  const install = async ({ packageName, dev, root, global }: ProjectInstallOpts) => {
    await showToast(Toast.Style.Animated, "installing", `${name} is installing at ${root}`);

    // some combinations make no sense
    if (global && root) {
      throw new Error("can't pass a directory for a global install");
    }

    if (global && !specs.globalFlag) {
      throw new Error(`${name} does not support global installations`);
    }

    if (global && dev) {
      throw new Error("can't install dev packages globally");
    }

    if (dev && !specs.devFlag) {
      throw new Error(`${name} does not support dev installations`);
    }

    const command = [name, specs.installCommand || defaultSpecs.installCommand, packageName];

    if (global) {
      command.push(specs.globalFlag || defaultSpecs.globalFlag);
    }

    // dev installs can't be global
    if (dev) {
      command.push(specs.devFlag || defaultSpecs.devFlag);
    }

    try {
      await $`cd ${root} && ${command}`;
    } catch (e) {
      console.error(e);
      throw new Error(`${name} failed to install ${packageName}`);
    }
  };

  const init = async ({ root }: ProjectInitOpts) => {
    console.warn(`manager ${name} has no init, assuming \`${name} init\``);

    try {
      await $`cd ${root} && ${name} ${specs.initCommand || defaultSpecs.initCommand} -y`;
    } catch (e) {
      console.error(e);
      throw new Error(`${name} ${specs.initCommand} has failed`);
    }
  };

  const checkPackage = async ({ pkgName, global }: CheckPageOpts): Promise<boolean> => {
    // TODO idk if this is working atm
    if (global && !specs.globalFlag) {
      throw new Error(`${name} does not support global installations`);
    }

    if (global) {
      const result = await $`${pkgName}`;
      return result.stderr.length === 0;
    }

    const result = await $`${name} list | grep ${pkgName}`;

    // grep doesn't show errors if no results are found
    return result.stdout.length > 0;
  };

  const isInstalled = async () => {
    try {
      await $`which ${name}`;
      return true;
    } catch {
      return false;
    }
  };

  return {
    name,
    init,
    install,
    isInstalled,
    checkPackage,
  };
};

const defaultNodeSpecs: NodePackageManagerSpecs = {
  ...defaultSpecs,
  createCommand: "create",
  templateArg: ["--template"],
};

const nodePackageManager = (
  name: NodePackageManagerName,
  specs: NodePackageManagerSpecs = defaultNodeSpecs,
): NodePackageManager => {
  const manager = packageManager(name, specs);

  const create = async ({ projectName, root, bundler, template }: NodeProjectCreateOpts) => {
    console.log("creating...");

    if (!specs.templateArg || specs.templateArg.length === 0) {
      const msg = `template argument not set in ${name} specs`;
      console.error(msg);
      await showError(msg);
      throw new Error(msg);
    }

    await showLoading(bundler, `${name} is running at ${root}`);

    const command = [
      name,
      specs.createCommand || defaultNodeSpecs.createCommand,
      bundler,
      projectName,
      ...specs.templateArg,
      template,
    ];

    try {
      await $`cd ${root} && ${command}`;
    } catch (e) {
      console.error(e);
      throw new Error(`${name} failed to create project ${root}/${projectName}`);
    }
  };

  return {
    ...manager,
    name,
    create,
  };
};

export const bun = (): NodePackageManager => {
  const manager = nodePackageManager("bun", {
    ...defaultNodeSpecs,
    installCommand: "add",
  });

  return {
    ...manager,
    checkPackage: async ({ pkgName, global }: CheckPageOpts) => {
      if (global) {
        return manager.checkPackage({ pkgName, global });
      }

      // read package.json and return if pkg name is in it
      return fs
        .readFile("./package.json", { encoding: "utf-8" })
        .then(JSON.parse)
        .then((pkg: Record<string, Record<string, string>>) => {
          function searchDeps(deps: Record<string, string>) {
            return !!Object.keys(deps).find((dep) => dep.search(pkgName));
          }

          return searchDeps(pkg.dependencies) || searchDeps(pkg.devDependencies);
        })
        .catch(() => false);
    },
  };
};

export const pnpm = () => {
  return nodePackageManager("pnpm", {
    ...defaultNodeSpecs,
    installCommand: "add",
  });
};
export const yarn = () => {
  return nodePackageManager("yarn", {
    ...defaultNodeSpecs,
    installCommand: "add",
  });
};

export const npm = (): NodePackageManager => {
  return nodePackageManager("npm", {
    ...defaultNodeSpecs,
    templateArg: ["--", "--template"],
  });
};

export const poetry = () => {
  return packageManager("poetry", {
    devFlag: "--group dev",
  });
};

// export const pip3 = () => {};  TODO

// export const goMod = () => {}; TODO

export function getManagerByName(name: PackageManagerName): PackageManager | NodePackageManager | null {
  switch (name) {
    case "pnpm":
      return pnpm();
    case "npm":
      return npm();
    case "yarn":
      return yarn();
    case "bun":
      return bun();
    case "poetry":
      return poetry();
    default:
      return null;
  }
}
