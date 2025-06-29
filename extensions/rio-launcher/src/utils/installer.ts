import { showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const execAsync = promisify(exec);

export interface DependencyConfig {
  name: string;
  checkCommand: string;
  installCommand: string;
  installMessage: string;
}

export interface CargoPackageConfig {
  name: string;
  packageName: string;
  binaryName: string;
}

export class DependencyInstaller {
  private async executeCommand(command: string): Promise<{ stdout: string; stderr: string }> {
    try {
      const result = await execAsync(command);
      return result;
    } catch (error) {
      throw new Error(`Command failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async isCommandAvailable(command: string): Promise<boolean> {
    try {
      await this.executeCommand(`which ${command}`);
      return true;
    } catch {
      return false;
    }
  }

  private async isCargoPackageInstalled(binaryName: string): Promise<boolean> {
    const binaryPath = join(homedir(), ".cargo", "bin", binaryName);
    return existsSync(binaryPath);
  }

  async checkAndInstallDependency(config: DependencyConfig): Promise<boolean> {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Checking ${config.name}...`,
    });

    try {
      const isInstalled = await this.isCommandAvailable(config.checkCommand);

      if (!isInstalled) {
        toast.title = config.installMessage;
        toast.message = "This may take a few minutes...";

        await this.executeCommand(config.installCommand);

        toast.style = Toast.Style.Success;
        toast.title = `${config.name} installed successfully`;
        return true;
      }

      toast.style = Toast.Style.Success;
      toast.title = `${config.name} is already installed`;
      return true;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Failed to install ${config.name}`;
      toast.message = error instanceof Error ? error.message : "Unknown error";
      throw error;
    }
  }

  async checkAndInstallRust(): Promise<boolean> {
    return this.checkAndInstallDependency({
      name: "Rust",
      checkCommand: "rustc",
      installCommand: "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y",
      installMessage: "Installing Rust...",
    });
  }

  async checkAndInstallCargo(): Promise<boolean> {
    return this.checkAndInstallDependency({
      name: "Cargo",
      checkCommand: "cargo",
      installCommand: "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y",
      installMessage: "Installing Cargo...",
    });
  }

  async checkAndInstallCargoPackage(config: CargoPackageConfig): Promise<boolean> {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Checking ${config.name}...`,
    });

    try {
      const isInstalled = await this.isCargoPackageInstalled(config.binaryName);

      if (!isInstalled) {
        toast.title = `Installing ${config.name}...`;
        toast.message = "This may take a few minutes...";

        // Ensure cargo is in PATH
        const cargoPath = join(homedir(), ".cargo", "bin");
        const env = { ...process.env, PATH: `${cargoPath}:${process.env.PATH}` };

        await execAsync(`cargo install ${config.packageName}`, { env });

        toast.style = Toast.Style.Success;
        toast.title = `${config.name} installed successfully`;
        return true;
      }

      toast.style = Toast.Style.Success;
      toast.title = `${config.name} is already installed`;
      return true;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Failed to install ${config.name}`;
      toast.message = error instanceof Error ? error.message : "Unknown error";
      throw error;
    }
  }

  async ensureRustToolchain(): Promise<boolean> {
    try {
      // Check and install Rust/Cargo (they come together)
      await this.checkAndInstallRust();

      // Ensure cargo is available after installation
      const cargoPath = join(homedir(), ".cargo", "bin");
      process.env.PATH = `${cargoPath}:${process.env.PATH}`;

      return true;
    } catch (error) {
      throw new Error(`Failed to setup Rust toolchain: ${error}`);
    }
  }
}
