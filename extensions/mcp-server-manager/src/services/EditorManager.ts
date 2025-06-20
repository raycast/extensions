import { BaseEditorService } from "./BaseEditorService";
import { CursorEditorService } from "./CursorEditorService";
import { WindsurfEditorService } from "./WindsurfEditorService";
import { VSCodeEditorService } from "./VSCodeEditorService";
import {
  EditorType,
  MCPServerWithMetadata,
  ValidationResult,
  MCPServerConfig,
  ValidationError,
  ValidationWarning,
} from "../types/mcpServer";
import { showFailureToast } from "@raycast/utils";

export class EditorManager {
  private services: Map<EditorType, BaseEditorService> = new Map();

  constructor() {
    this.initializeServices();
  }

  private initializeServices(): void {
    this.services.set("cursor", new CursorEditorService());
    this.services.set("windsurf", new WindsurfEditorService());
    this.services.set("vscode", new VSCodeEditorService());
  }

  getService(editorType: EditorType): BaseEditorService {
    const service = this.services.get(editorType);
    if (!service) {
      throw new Error(`No service found for editor: ${editorType}`);
    }
    return service;
  }

  getAvailableEditors(): EditorType[] {
    return Array.from(this.services.keys());
  }

  getImplementedEditors(): EditorType[] {
    return Array.from(this.services.keys());
  }

  async readAllServers(): Promise<MCPServerWithMetadata[]> {
    const allServers: MCPServerWithMetadata[] = [];

    for (const [editorType, service] of this.services) {
      try {
        if (editorType === "vscode") {
          const vscodeService = service as VSCodeEditorService;
          if (vscodeService.isConfigTypeAvailable("workspace")) {
            try {
              const workspaceServers = await service.readConfig("workspace");
              allServers.push(...workspaceServers);
            } catch (error) {
              if (
                error instanceof Error &&
                error.message.includes("No VS Code workspace found")
              ) {
                // This is expected, not an error
              } else {
                showFailureToast("Failed to read VS Code workspace servers", {
                  message:
                    error instanceof Error ? error.message : String(error),
                });
              }
            }
          }

          try {
            const userServers = await service.readConfig("user");
            allServers.push(...userServers);
          } catch (error) {
            showFailureToast("Failed to read VS Code user servers", {
              message: error instanceof Error ? error.message : String(error),
            });
          }
        } else {
          const servers = await service.readConfig();
          allServers.push(...servers);
        }
      } catch (error) {
        showFailureToast(`Failed to read servers from ${editorType}`, {
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return allServers;
  }

  async readServersFromEditor(
    editorType: EditorType,
    configType?: "global" | "workspace" | "user",
  ): Promise<MCPServerWithMetadata[]> {
    const service = this.getService(editorType);
    return await service.readConfig(configType);
  }

  async writeServersToEditor(
    editorType: EditorType,
    servers: MCPServerWithMetadata[],
    configType?: "global" | "workspace" | "user",
  ): Promise<void> {
    const service = this.getService(editorType);
    await service.writeConfig(servers, configType);
  }

  async addServer(
    editorType: EditorType,
    serverConfig: MCPServerConfig,
    configType?: "global" | "workspace" | "user",
  ): Promise<void> {
    const service = this.getService(editorType);
    const validation = service.validateServerConfig(serverConfig);

    if (!validation.isValid) {
      throw new Error(
        `Server configuration is invalid: ${validation.errors.map((e) => e.message).join(", ")}`,
      );
    }

    const existingServers = await service.readConfig(configType);

    const duplicateServer = existingServers.find(
      (s) => s.config.name === serverConfig.name,
    );
    if (duplicateServer) {
      throw new Error(
        `A server with name "${serverConfig.name}" already exists`,
      );
    }

    const newServer: MCPServerWithMetadata = {
      config: serverConfig,
      editor: editorType,
      source: configType || "global",
    };

    existingServers.push(newServer);

    await service.writeConfig(existingServers, configType);
  }

  async updateServer(
    editorType: EditorType,
    serverName: string,
    updatedConfig: MCPServerConfig,
    configType?: "global" | "workspace" | "user",
  ): Promise<void> {
    const service = this.getService(editorType);
    const validation = service.validateServerConfig(updatedConfig);

    if (!validation.isValid) {
      throw new Error(
        `Server configuration is invalid: ${validation.errors.map((e) => e.message).join(", ")}`,
      );
    }

    const existingServers = await service.readConfig(configType);

    const serverIndex = existingServers.findIndex(
      (s) => s.config.name === serverName,
    );
    if (serverIndex === -1) {
      throw new Error(`Server "${serverName}" not found`);
    }

    if (updatedConfig.name !== serverName) {
      const duplicateServer = existingServers.find(
        (s, index) =>
          index !== serverIndex && s.config.name === updatedConfig.name,
      );
      if (duplicateServer) {
        throw new Error(
          `A server with name "${updatedConfig.name}" already exists`,
        );
      }
    }

    existingServers[serverIndex].config = updatedConfig;

    await service.writeConfig(existingServers, configType);
  }

  async deleteServer(
    editorType: EditorType,
    serverName: string,
    configType?: "global" | "workspace" | "user",
  ): Promise<void> {
    const service = this.getService(editorType);

    const existingServers = await service.readConfig(configType);

    const serverIndex = existingServers.findIndex(
      (s) => s.config.name === serverName,
    );
    if (serverIndex === -1) {
      throw new Error(`Server "${serverName}" not found`);
    }

    existingServers.splice(serverIndex, 1);

    await service.writeConfig(existingServers, configType);
  }

  async toggleServer(
    editorType: EditorType,
    serverName: string,
    configType?: "global" | "workspace" | "user",
  ): Promise<void> {
    const service = this.getService(editorType);

    const existingServers = await service.readConfig(configType);

    const server = existingServers.find((s) => s.config.name === serverName);
    if (!server) {
      throw new Error(`Server "${serverName}" not found`);
    }

    server.config.disabled = !server.config.disabled;

    await service.writeConfig(existingServers, configType);
  }

  async validateAllConfigurations(): Promise<
    Map<EditorType, ValidationResult>
  > {
    const results = new Map<EditorType, ValidationResult>();

    for (const [editorType, service] of this.services) {
      try {
        const servers = await service.readConfig();

        const allErrors: ValidationError[] = [];
        const allWarnings: ValidationWarning[] = [];

        servers.forEach((server, index) => {
          const validation = service.validateServerConfig(server.config);
          validation.errors.forEach((error) => {
            allErrors.push({
              ...error,
              field: `servers[${index}].${error.field}`,
            });
          });

          if (validation.warnings) {
            validation.warnings.forEach((warning) => {
              allWarnings.push({
                ...warning,
                field: `servers[${index}].${warning.field}`,
              });
            });
          }
        });

        results.set(editorType, {
          isValid: allErrors.length === 0,
          errors: allErrors,
          warnings: allWarnings,
        });
      } catch (error) {
        results.set(editorType, {
          isValid: false,
          errors: [
            {
              field: "config",
              message: `Failed to read configuration: ${error instanceof Error ? error.message : "Unknown error"}`,
              code: "FILE_READ_ERROR",
            },
          ],
          warnings: [],
        });
      }
    }

    return results;
  }

  async searchServers(query: string): Promise<MCPServerWithMetadata[]> {
    const allServers = await this.readAllServers();
    const lowercaseQuery = query.toLowerCase();

    return allServers.filter((server) => {
      const config = server.config;
      return (
        config.name.toLowerCase().includes(lowercaseQuery) ||
        (config.description &&
          config.description.toLowerCase().includes(lowercaseQuery)) ||
        ("command" in config &&
          config.command.toLowerCase().includes(lowercaseQuery)) ||
        ("url" in config && config.url.toLowerCase().includes(lowercaseQuery))
      );
    });
  }

  getConfigPaths(): Map<EditorType, string | null> {
    const paths = new Map<EditorType, string | null>();

    for (const [editorType, service] of this.services) {
      paths.set(editorType, service.getConfigPath());
    }

    return paths;
  }

  isEditorSupported(editorType: EditorType): boolean {
    return this.services.has(editorType);
  }
}
