import { FileItem, VPSConnection, VPSConnectionData } from "../types";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFileSync, unlinkSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { execFile } from "child_process";

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

export class VPSOperations implements VPSConnection {
  private config: VPSConnectionData;
  private connected: boolean = false;

  constructor(config: VPSConnectionData) {
    this.config = config;
  }

  private async createExpectScript(command: string, password?: string): Promise<string> {
    const scriptPath = join(tmpdir(), `ssh_script_${Date.now()}.exp`);

    const expectScript = password
      ? `#!/usr/bin/expect -f
set timeout 30
spawn ${command}
expect {
    "password:" {
        send "${password}\\r"
        exp_continue
    }
    "Password:" {
        send "${password}\\r"
        exp_continue
    }
    "(yes/no)?" {
        send "yes\\r"
        exp_continue
    }
    "Connection test successful" {
        exit 0
    }
    timeout {
        exit 1
    }
    eof
}
`
      : `#!/usr/bin/expect -f
set timeout 30
spawn ${command}
expect {
    "(yes/no)?" {
        send "yes\\r"
        exp_continue
    }
    "Connection test successful" {
        exit 0
    }
    timeout {
        exit 1
    }
    eof
}
`;

    writeFileSync(scriptPath, expectScript);
    return scriptPath;
  }

  async connect(config: VPSConnectionData): Promise<void> {
    this.config = config;

    try {
      let result: { stdout: string; stderr: string };

      if (this.config.password) {
        const connectionScript = `#!/usr/bin/expect -f
set timeout 30
set password [lindex $argv 0]
spawn ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR -o CheckHostIP=no -p ${this.config.port} ${this.config.username}@${this.config.host} "echo 'Connection test successful'"
expect {
    "password:" {
        send "$password\\r"
        exp_continue
    }
    "Password:" {
        send "$password\\r"
        exp_continue
    }
    "Connection test successful" {
        exit 0
    }
    timeout {
        exit 1
    }
    eof
}
`;

        const scriptPath = join(tmpdir(), `ssh_connect_${Date.now()}.exp`);
        writeFileSync(scriptPath, connectionScript, { mode: 0o700 });

        result = await execFileAsync("expect", [scriptPath, this.config.password]);

        try {
          unlinkSync(scriptPath);
        } catch (cleanupError) {
          console.warn("Failed to cleanup temporary script:", cleanupError);
        }
      } else {
        const connectionCommand = `ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR -o CheckHostIP=no -p ${this.config.port} ${this.config.username}@${this.config.host} "echo 'Connection test successful'"`;
        result = await execAsync(connectionCommand);
      }

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

    let scriptPath: string | null = null;

    try {
      let result: { stdout: string; stderr: string };

      if (this.config.password) {
        const escapedRemotePath = remotePath
          .replace(/\\/g, "\\\\")
          .replace(/\$/g, "\\$")
          .replace(/\[/g, "\\[")
          .replace(/\]/g, "\\]");

        const lsCommand = fileGlob ? `ls -la '\$remote_path/${fileGlob}'` : `ls -la '\$remote_path'`;

        const listScript = `#!/usr/bin/expect -f
set timeout 30
set remote_path {${escapedRemotePath}}
spawn ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR -o CheckHostIP=no -p ${this.config.port} ${this.config.username}@${this.config.host} "${lsCommand}"
expect {
    "password:" {
        send "${this.config.password}\\r"
        exp_continue
    }
    "Password:" {
        send "${this.config.password}\\r"
        exp_continue
    }
    eof
}
`;
        scriptPath = join(tmpdir(), `ssh_list_${Date.now()}.exp`);
        writeFileSync(scriptPath, listScript);
        await execAsync(`chmod +x ${scriptPath}`);
        result = await execAsync(`expect ${scriptPath}`);
      } else {
        const escapedPath = remotePath.replace(/'/g, "'\\''");
        const lsCommand = fileGlob ? `ls -la '${escapedPath}/${fileGlob}'` : `ls -la '${escapedPath}'`;
        const sshCommand = `ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR -o CheckHostIP=no -p ${this.config.port} ${this.config.username}@${this.config.host} "${lsCommand}"`;
        result = await execAsync(sshCommand);
      }

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
    } finally {
      if (scriptPath) {
        try {
          unlinkSync(scriptPath);
        } catch (cleanupError) {
          console.warn("Failed to cleanup temporary script:", cleanupError);
        }
      }
    }
  }

  async createDirectory(remotePath: string, directoryName: string): Promise<void> {
    if (!this.connected) {
      throw new Error("Not connected to the VPS");
    }

    console.log(`Creating directory "${directoryName}" in ${remotePath}`);

    let scriptPath: string | null = null;

    try {
      const fullPath = join(remotePath, directoryName);
      const escapedPath = fullPath.replace(/'/g, "'\\''");

      const mkdirCommand = `mkdir -p '${escapedPath}' && echo MKDIR_SUCCESS`;

      let result: { stdout: string; stderr: string };

      if (this.config.password) {
        const createDirScript = `#!/usr/bin/expect -f
set timeout 30
spawn ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR -o CheckHostIP=no -p ${this.config.port} ${this.config.username}@${this.config.host} ${mkdirCommand}
expect {
    "password:" {
        send "${this.config.password}\\r"
        exp_continue
    }
    "Password:" {
        send "${this.config.password}\\r"
        exp_continue
    }
    "MKDIR_SUCCESS" {
        exit 0
    }
    eof
}
`;
        scriptPath = join(tmpdir(), `ssh_mkdir_${Date.now()}.exp`);
        writeFileSync(scriptPath, createDirScript);
        await execAsync(`chmod +x ${scriptPath}`);
        result = await execAsync(`expect ${scriptPath}`);
      } else {
        const sshCommand = `ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR -o CheckHostIP=no -p ${this.config.port} ${this.config.username}@${this.config.host} ${mkdirCommand}`;
        result = await execAsync(sshCommand);
      }

      if (!result.stdout.includes("MKDIR_SUCCESS")) {
        throw new Error("Directory creation did not complete successfully");
      }

      console.log(`✅ Successfully created directory: ${fullPath}`);
    } catch (error) {
      console.error(`Failed to create directory: ${error}`);
      throw new Error(
        `Failed to create directory "${directoryName}": ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      if (scriptPath) {
        try {
          unlinkSync(scriptPath);
        } catch (cleanupError) {
          console.warn("Failed to cleanup temporary script:", cleanupError);
        }
      }
    }
  }

  async deleteFile(remotePath: string): Promise<void> {
    if (!this.connected) {
      throw new Error("Not connected to the VPS");
    }

    console.log(`Deleting file "${remotePath}"`);

    let scriptPath: string | null = null;

    try {
      const escapedPath = remotePath.replace(/'/g, "'\\''");

      const deleteCommand = `rm -rf '${escapedPath}' && echo DELETE_SUCCESS`;

      let result: { stdout: string; stderr: string };

      if (this.config.password) {
        const deleteScript = `#!/usr/bin/expect -f
  set timeout 30
  spawn ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR -o CheckHostIP=no -p ${this.config.port} ${this.config.username}@${this.config.host} ${deleteCommand}
  expect {
      "password:" {
          send "${this.config.password}\\r"
          exp_continue
      }
      "Password:" {
          send "${this.config.password}\\r"
          exp_continue
      }
      "DELETE_SUCCESS" {
          exit 0
      }
      eof
  }
  `;
        scriptPath = join(tmpdir(), `ssh_delete_${Date.now()}.exp`);
        writeFileSync(scriptPath, deleteScript);
        await execAsync(`chmod +x ${scriptPath}`);
        result = await execAsync(`expect ${scriptPath}`);
      } else {
        const sshCommand = `ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR -o CheckHostIP=no -p ${this.config.port} ${this.config.username}@${this.config.host} ${deleteCommand}`;
        result = await execAsync(sshCommand);
      }

      if (!result.stdout.includes("DELETE_SUCCESS")) {
        throw new Error("File deletion did not complete successfully");
      }

      console.log(`✅ Successfully deleted: ${remotePath}`);
    } catch (error) {
      console.error(`Failed to delete file: ${error}`);
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      if (scriptPath) {
        try {
          unlinkSync(scriptPath);
        } catch (cleanupError) {
          console.warn("Failed to cleanup temporary script:", cleanupError);
        }
      }
    }
  }

  async renameFile(remotePath: string, newName: string): Promise<void> {
    if (!this.connected) {
      throw new Error("Not connected to the VPS");
    }

    console.log(`Renaming file "${remotePath}" to "${newName}"`);

    let scriptPath: string | null = null;

    try {
      const directory = remotePath.substring(0, remotePath.lastIndexOf("/")) || "/";
      const newPath = join(directory, newName);
      const escapedOldPath = remotePath.replace(/'/g, "'\\''");
      const escapedNewPath = newPath.replace(/'/g, "'\\''");

      const renameCommand = `mv '${escapedOldPath}' '${escapedNewPath}' && echo RENAME_SUCCESS`;

      let result: { stdout: string; stderr: string };

      if (this.config.password) {
        const renameScript = `#!/usr/bin/expect -f
set timeout 30
spawn ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR -o CheckHostIP=no -p ${this.config.port} ${this.config.username}@${this.config.host} ${renameCommand}
expect {
    "password:" {
        send "${this.config.password}\\r"
        exp_continue
    }
    "Password:" {
        send "${this.config.password}\\r"
        exp_continue
    }
    "RENAME_SUCCESS" {
        exit 0
    }
    eof
}
`;
        scriptPath = join(tmpdir(), `ssh_rename_${Date.now()}.exp`);
        writeFileSync(scriptPath, renameScript);
        await execAsync(`chmod +x ${scriptPath}`);
        result = await execAsync(`expect ${scriptPath}`);
      } else {
        const sshCommand = `ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR -o CheckHostIP=no -p ${this.config.port} ${this.config.username}@${this.config.host} ${renameCommand}`;
        result = await execAsync(sshCommand);
      }

      if (!result.stdout.includes("RENAME_SUCCESS")) {
        throw new Error("File rename did not complete successfully");
      }

      console.log(`✅ Successfully renamed to: ${newPath}`);
    } catch (error) {
      console.error(`Failed to rename file: ${error}`);
      throw new Error(`Failed to rename file: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      if (scriptPath) {
        try {
          unlinkSync(scriptPath);
        } catch (cleanupError) {
          console.warn("Failed to cleanup temporary script:", cleanupError);
        }
      }
    }
  }

  async downloadFile(remotePath: string, localPath: string): Promise<void> {
    if (!this.connected) {
      throw new Error("Not connected to the VPS");
    }

    console.log(`Downloading file "${remotePath}" to "${localPath}"`);

    let scriptPath: string | null = null;

    try {
      let result: { stdout: string; stderr: string };

      if (this.config.password) {
        const escapedRemotePath = remotePath
          .replace(/\\/g, "\\\\")
          .replace(/\$/g, "\\$")
          .replace(/\[/g, "\\[")
          .replace(/\]/g, "\\]");
        const escapedLocalPath = localPath
          .replace(/\\/g, "\\\\")
          .replace(/\$/g, "\\$")
          .replace(/\[/g, "\\[")
          .replace(/\]/g, "\\]");

        const downloadScript = `#!/usr/bin/expect -f
set timeout 120
set remote_path {${escapedRemotePath}}
set local_path {${escapedLocalPath}}
set remote_spec "${this.config.username}@${this.config.host}:\$remote_path"

spawn scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR -o CheckHostIP=no -P ${this.config.port} \$remote_spec \$local_path

expect {
    "password:" {
        send "${this.config.password}\\r"
        exp_continue
    }
    "Password:" {
        send "${this.config.password}\\r"
        exp_continue
    }
    -re "100%|bytes" {
        sleep 1
        exit 0
    }
    timeout {
        exit 1
    }
    eof {
        sleep 1
        exit 0
    }
}
`;
        scriptPath = join(tmpdir(), `scp_download_${Date.now()}.exp`);
        writeFileSync(scriptPath, downloadScript);
        await execAsync(`chmod +x ${scriptPath}`);

        console.log(`Executing expect script: ${scriptPath}`);
        result = await execAsync(`expect ${scriptPath}`);
        console.log(`Download result stdout: ${result.stdout}`);
        console.log(`Download result stderr: ${result.stderr}`);
      } else {
        const escapedRemotePath = remotePath.replace(/'/g, "'\\''");
        const escapedLocalPath = localPath.replace(/'/g, "'\\''");
        const downloadCommand = `scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR -o CheckHostIP=no -P ${this.config.port} ${this.config.username}@${this.config.host}:'${escapedRemotePath}' '${escapedLocalPath}'`;
        result = await execAsync(downloadCommand);
      }

      await new Promise((resolve) => setTimeout(resolve, 500));

      if (!existsSync(localPath)) {
        throw new Error(`File was not downloaded to local path: ${localPath}`);
      }

      console.log(`✅ Successfully downloaded to: ${localPath}`);
    } catch (error) {
      console.error(`Failed to download file: ${error}`);
      throw new Error(`Failed to download file: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      if (scriptPath) {
        try {
          unlinkSync(scriptPath);
        } catch (cleanupError) {
          console.warn("Failed to cleanup temporary script:", cleanupError);
        }
      }
    }
  }

  async uploadFile(remotePath: string, localPath: string): Promise<void> {
    if (!this.connected) {
      throw new Error("Not connected to the VPS");
    }

    console.log(`Uploading file "${localPath}" to "${remotePath}"`);

    let scriptPath: string | null = null;

    try {
      let result: { stdout: string; stderr: string };

      if (this.config.password) {
        const escapedLocalPath = localPath
          .replace(/\\/g, "\\\\")
          .replace(/\$/g, "\\$")
          .replace(/\[/g, "\\[")
          .replace(/\]/g, "\\]");
        const escapedRemotePath = remotePath
          .replace(/\\/g, "\\\\")
          .replace(/\$/g, "\\$")
          .replace(/\[/g, "\\[")
          .replace(/\]/g, "\\]");

        const uploadScript = `#!/usr/bin/expect -f
set timeout 120
set local_path {${escapedLocalPath}}
set remote_path {${escapedRemotePath}}
set remote_spec "${this.config.username}@${this.config.host}:\$remote_path"

spawn scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR -o CheckHostIP=no -P ${this.config.port} \$local_path \$remote_spec

expect {
    "password:" {
        send "${this.config.password}\\r"
        exp_continue
    }
    "Password:" {
        send "${this.config.password}\\r"
        exp_continue
    }
    -re "100%|bytes" {
        sleep 1
        exit 0
    }
    timeout {
        exit 1
    }
    eof {
        sleep 1
        exit 0
    }
}
`;
        scriptPath = join(tmpdir(), `scp_upload_${Date.now()}.exp`);
        writeFileSync(scriptPath, uploadScript);
        await execAsync(`chmod +x ${scriptPath}`);

        console.log(`Executing expect script: ${scriptPath}`);
        result = await execAsync(`expect ${scriptPath}`);
        console.log(`Upload result stdout: ${result.stdout}`);
        console.log(`Upload result stderr: ${result.stderr}`);
      } else {
        const escapedLocalPath = localPath.replace(/'/g, "'\\''");
        const escapedRemotePath = remotePath.replace(/'/g, "'\\''");
        const uploadCommand = `scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR -o CheckHostIP=no -P ${this.config.port} '${escapedLocalPath}' ${this.config.username}@${this.config.host}:'${escapedRemotePath}'`;
        result = await execAsync(uploadCommand);
      }

      await new Promise((resolve) => setTimeout(resolve, 500));

      if (!existsSync(localPath)) {
        throw new Error(`Local file disappeared: ${localPath}`);
      }

      console.log(`✅ Successfully uploaded to: ${remotePath}`);
    } catch (error) {
      console.error(`Failed to upload file: ${error}`);
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      if (scriptPath) {
        try {
          unlinkSync(scriptPath);
        } catch (cleanupError) {
          console.warn("Failed to cleanup temporary script:", cleanupError);
        }
      }
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}
