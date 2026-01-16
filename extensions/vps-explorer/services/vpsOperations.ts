import { FileItem, VPSConnection, VPSConnectionData } from "../types";
import { spawn } from "child_process";
import { writeFileSync, unlinkSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

export class VPSOperations implements VPSConnection {
  private config: VPSConnectionData;
  private connected: boolean = false;

  constructor(config: VPSConnectionData) {
    this.config = config;
  }

  /**
   * Execute SSH/SCP command with password support via environment variable
   * Password is passed via environment, NOT embedded in script file
   */
  private async execSSH(command: string): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      let scriptPath: string | null = null;

      try {
        // Create expect script that reads password from environment variable
        const expectScript = `#!/usr/bin/expect -f
  set timeout 120
  set password $env(VPS_SSH_PASSWORD)
  spawn sh -c "${command.replace(/"/g, '\\"')}"
  expect {
      "password:" {
          send "$password\\r"
          exp_continue
      }
      "Password:" {
          send "$password\\r"
          exp_continue
      }
      "(yes/no)?" {
          send "yes\\r"
          exp_continue
      }
      timeout {
          exit 1
      }
      eof {
          catch wait result
          exit [lindex \$result 3]
      }
  }
  `;

        scriptPath = join(tmpdir(), `ssh_${Date.now()}.exp`);
        writeFileSync(scriptPath, expectScript, { mode: 0o700 });

        const child = spawn("expect", [scriptPath], {
          env: {
            ...process.env,
            VPS_SSH_PASSWORD: this.config.password || "",
          },
          stdio: ["ignore", "pipe", "pipe"],
        });

        let stdout = "";
        let stderr = "";

        child.stdout?.on("data", (data) => {
          stdout += data.toString();
        });

        child.stderr?.on("data", (data) => {
          stderr += data.toString();
        });

        child.on("close", (code) => {
          if (scriptPath) {
            try {
              unlinkSync(scriptPath);
            } catch (e) {
              console.warn("Failed to cleanup script:", e);
            }
          }

          if (code === 0) {
            resolve({ stdout, stderr });
          } else {
            reject(new Error(`Command failed with code ${code}: ${stderr || stdout}`));
          }
        });

        child.on("error", (error) => {
          if (scriptPath) {
            try {
              unlinkSync(scriptPath);
            } catch (e) {
              console.warn("Failed to cleanup script:", e);
            }
          }
          reject(error);
        });
      } catch (error) {
        if (scriptPath) {
          try {
            unlinkSync(scriptPath);
          } catch (e) {
            console.warn("Failed to cleanup script:", e);
          }
        }
        reject(error);
      }
    });
  }

  async connect(config: VPSConnectionData): Promise<void> {
    this.config = config;

    try {
      const connectionCommand = `ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR -o CheckHostIP=no -p ${this.config.port} ${this.config.username}@${this.config.host} "echo 'Connection test successful'"`;

      await this.execSSH(connectionCommand);

      this.connected = true;
      console.log("Connected successfully!");
    } catch (error) {
      this.connected = false;
      console.error(`Connection failed: ${error}`);
      throw new Error(`Failed to connect to VPS: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    console.log("Disconnected successfully!");
  }

  async listFiles(remotePath: string, fileGlob?: string): Promise<FileItem[]> {
    if (!this.connected) {
      throw new Error("Not connected to the VPS");
    }

    console.log(`Listing files in ${remotePath}`);

    try {
      const escapedPath = remotePath.replace(/'/g, "'\\''");
      const lsCommand = fileGlob ? `ls -la '${escapedPath}/${fileGlob}'` : `ls -la '${escapedPath}'`;
      const sshCommand = `ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR -o CheckHostIP=no -p ${this.config.port} ${this.config.username}@${this.config.host} "${lsCommand}"`;

      const result = await this.execSSH(sshCommand);

      const lines = result.stdout.split("\n").filter((line) => line.trim() !== "");
      const fileItems: FileItem[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const parts = line.trim().split(/\s+/);

        const lookLikePermissions = /^[d\-lrwx]{10}$/.test(parts[0]);

        if (parts.length >= 9 && lookLikePermissions) {
          const fileName = parts.slice(8).join(" ");

          if (fileName !== "." && fileName !== "..") {
            const permissions = parts[0];
            const owner = parts[2];
            const group = parts[3];
            const size = parseInt(parts[4]) || 0;
            const month = parts[5];
            const day = parts[6];
            const timeOrYear = parts[7];

            const type = permissions.startsWith("d") ? "directory" : "file";

            const currentYear = new Date().getFullYear();
            let modifiedTime: Date;

            if (timeOrYear.includes(":")) {
              modifiedTime = new Date(`${month} ${day}, ${currentYear} ${timeOrYear}`);
            } else {
              modifiedTime = new Date(`${month} ${day}, ${timeOrYear} 12:00`);
            }

            fileItems.push({
              name: fileName,
              path: join(remotePath, fileName),
              type: type,
              size: size,
              permissions: permissions,
              modifiedTime: modifiedTime,
              owner: owner,
              group: group,
            });
          }
        }
      }

      console.log(`\n📊 Summary: Found ${fileItems.length} items in ${remotePath}`);
      return fileItems;
    } catch (error) {
      console.error(`Listing failed: ${error}`);
      throw new Error(`Failed to list files: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async createDirectory(remotePath: string, directoryName: string): Promise<void> {
    if (!this.connected) {
      throw new Error("Not connected to the VPS");
    }

    console.log(`Creating directory "${directoryName}" in ${remotePath}`);

    try {
      const fullPath = join(remotePath, directoryName);
      const escapedPath = fullPath.replace(/'/g, "'\\''");
      const mkdirCommand = `mkdir -p '${escapedPath}' && echo MKDIR_SUCCESS`;
      const sshCommand = `ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR -o CheckHostIP=no -p ${this.config.port} ${this.config.username}@${this.config.host} ${mkdirCommand}`;

      const result = await this.execSSH(sshCommand);

      if (!result.stdout.includes("MKDIR_SUCCESS")) {
        throw new Error("Directory creation did not complete successfully");
      }

      console.log(`✅ Successfully created directory: ${fullPath}`);
    } catch (error) {
      console.error(`Failed to create directory: ${error}`);
      throw new Error(
        `Failed to create directory "${directoryName}": ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async deleteFile(remotePath: string): Promise<void> {
    if (!this.connected) {
      throw new Error("Not connected to the VPS");
    }

    console.log(`Deleting file "${remotePath}"`);

    try {
      const escapedPath = remotePath.replace(/'/g, "'\\''");
      const deleteCommand = `rm -rf '${escapedPath}' && echo DELETE_SUCCESS`;
      const sshCommand = `ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR -o CheckHostIP=no -p ${this.config.port} ${this.config.username}@${this.config.host} ${deleteCommand}`;

      const result = await this.execSSH(sshCommand);

      if (!result.stdout.includes("DELETE_SUCCESS")) {
        throw new Error("File deletion did not complete successfully");
      }

      console.log(`✅ Successfully deleted: ${remotePath}`);
    } catch (error) {
      console.error(`Failed to delete file: ${error}`);
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async renameFile(remotePath: string, newName: string): Promise<void> {
    if (!this.connected) {
      throw new Error("Not connected to the VPS");
    }

    console.log(`Renaming file "${remotePath}" to "${newName}"`);

    try {
      const directory = remotePath.substring(0, remotePath.lastIndexOf("/")) || "/";
      const newPath = join(directory, newName);
      const escapedOldPath = remotePath.replace(/'/g, "'\\''");
      const escapedNewPath = newPath.replace(/'/g, "'\\''");
      const renameCommand = `mv '${escapedOldPath}' '${escapedNewPath}' && echo RENAME_SUCCESS`;
      const sshCommand = `ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR -o CheckHostIP=no -p ${this.config.port} ${this.config.username}@${this.config.host} ${renameCommand}`;

      const result = await this.execSSH(sshCommand);

      if (!result.stdout.includes("RENAME_SUCCESS")) {
        throw new Error("File rename did not complete successfully");
      }

      console.log(`✅ Successfully renamed to: ${newPath}`);
    } catch (error) {
      console.error(`Failed to rename file: ${error}`);
      throw new Error(`Failed to rename file: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async downloadFile(remotePath: string, localPath: string): Promise<void> {
    if (!this.connected) {
      throw new Error("Not connected to the VPS");
    }

    console.log(`Downloading file "${remotePath}" to "${localPath}"`);

    try {
      const escapedRemotePath = remotePath.replace(/'/g, "'\\''");
      const escapedLocalPath = localPath.replace(/'/g, "'\\''");
      const downloadCommand = `scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR -o CheckHostIP=no -P ${this.config.port} ${this.config.username}@${this.config.host}:'${escapedRemotePath}' '${escapedLocalPath}'`;

      await this.execSSH(downloadCommand);
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (!existsSync(localPath)) {
        throw new Error(`File was not downloaded to local path: ${localPath}`);
      }

      console.log(`✅ Successfully downloaded to: ${localPath}`);
    } catch (error) {
      console.error(`Failed to download file: ${error}`);
      throw new Error(`Failed to download file: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async uploadFile(remotePath: string, localPath: string): Promise<void> {
    if (!this.connected) {
      throw new Error("Not connected to the VPS");
    }

    console.log(`Uploading file "${localPath}" to "${remotePath}"`);

    try {
      const escapedLocalPath = localPath.replace(/'/g, "'\\''");
      const escapedRemotePath = remotePath.replace(/'/g, "'\\''");
      const uploadCommand = `scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR -o CheckHostIP=no -P ${this.config.port} '${escapedLocalPath}' ${this.config.username}@${this.config.host}:'${escapedRemotePath}'`;

      await this.execSSH(uploadCommand);
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (!existsSync(localPath)) {
        throw new Error(`Local file disappeared: ${localPath}`);
      }

      console.log(`✅ Successfully uploaded to: ${remotePath}`);
    } catch (error) {
      console.error(`Failed to upload file: ${error}`);
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}
