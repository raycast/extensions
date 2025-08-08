import { Clipboard, environment, LocalStorage, showToast, Toast } from "@raycast/api";
import { promises as fs } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import {
  ClipboardContent,
  ClipboardState,
  RegisterMetadata,
  RegisterId,
  ContentType,
  RegisterDisplayData,
} from "./types";
import { CONFIG, CONTENT_TYPES, DEFAULT_STATE, REGISTER_IDS } from "./constants";
import { RegisterError, FileOperationError, StateError, ClipboardError } from "./errors";
import {
  validateRegisterId,
  validateClipboardState,
  sanitizeFilePath,
  validateTextContent,
  validateFilePaths,
  validateHtmlContent,
  createTextPreview,
} from "./validation";

/**
 * Converts file URI to regular file path
 */
function fileUriToPath(uri: string): string {
  if (uri.startsWith("file://")) {
    return decodeURIComponent(uri.slice(7));
  }
  return uri;
}

/**
 * Manages clipboard registers with persistent storage
 */
export class RegisterManager {
  private static instance: RegisterManager;
  private contentPath: string;

  private constructor() {
    this.contentPath = join(environment.supportPath, CONFIG.CONTENT_DIR);
  }

  /**
   * Gets the singleton instance of RegisterManager
   */
  static getInstance(): RegisterManager {
    if (!RegisterManager.instance) {
      RegisterManager.instance = new RegisterManager();
    }
    return RegisterManager.instance;
  }

  /**
   * Ensures the content directory exists (with caching to avoid repeated checks)
   */
  private _directoryEnsured = false;

  async ensureContentDirectory(): Promise<void> {
    if (this._directoryEnsured) {
      return;
    }

    try {
      await fs.mkdir(this.contentPath, { recursive: true });
      this._directoryEnsured = true;
    } catch (error) {
      throw new FileOperationError(`Failed to create content directory: ${error}`, this.contentPath);
    }
  }

  /**
   * Writes a file atomically by writing to a temporary file first, then renaming
   * This prevents corruption if the write operation is interrupted
   */
  private async writeFileAtomic(filePath: string, content: string): Promise<void> {
    const tempPath = `${filePath}.tmp`;

    try {
      await fs.writeFile(tempPath, content, "utf-8");
      await fs.rename(tempPath, filePath);
    } catch (error) {
      // Clean up temp file if it exists
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  /**
   * Retrieves the current clipboard state from storage
   */
  async getState(): Promise<ClipboardState> {
    const stored = await LocalStorage.getItem<string>(CONFIG.STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return validateClipboardState(parsed);
      } catch (error) {
        console.error("Failed to parse stored state:", error);
        throw new StateError(`Invalid stored state: ${error}`);
      }
    }

    // Return default state
    return { ...DEFAULT_STATE };
  }

  /**
   * Saves the clipboard state to storage
   */
  async setState(state: ClipboardState): Promise<void> {
    try {
      const validatedState = validateClipboardState(state);
      await LocalStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(validatedState));
    } catch (error) {
      throw new StateError(`Failed to save state: ${error}`);
    }
  }

  /**
   * Initializes the clipboard registers if not already done
   */
  async initializeIfNeeded(): Promise<void> {
    const state = await this.getState();

    if (!state.initialized) {
      try {
        // First run - capture current clipboard content for register 1
        const currentContent = await this.getCurrentClipboardContent();

        if (currentContent) {
          state.registers[1] = await this.saveContentToFile(currentContent, 1);
        }

        state.activeRegister = 1;
        state.initialized = true;
        await this.setState(state);

        await showToast({
          style: Toast.Style.Success,
          title: "Clipboard Registers Initialized",
          message: "Register 1 is now active with current clipboard content",
        });
      } catch (error) {
        throw new RegisterError(`Failed to initialize clipboard registers: ${error}`);
      }
    }
  }

  /**
   * Gets the current clipboard content
   */
  async getCurrentClipboardContent(): Promise<ClipboardContent | null> {
    try {
      const content = await Clipboard.read();

      if (content.file) {
        // Convert file URI to regular path for storage
        const filePath = fileUriToPath(content.file);
        const validatedPaths = validateFilePaths([filePath]);
        return {
          type: CONTENT_TYPES.FILE,
          filePaths: validatedPaths,
        };
      } else if (content.html) {
        const validatedHtml = validateHtmlContent(content.html, content.text);
        return {
          type: CONTENT_TYPES.HTML,
          html: validatedHtml.html,
          text: validatedHtml.text,
        };
      } else if (content.text) {
        const validatedText = validateTextContent(content.text);
        return {
          type: CONTENT_TYPES.TEXT,
          text: validatedText,
        };
      }

      return null;
    } catch (error) {
      throw new ClipboardError(`Failed to read clipboard: ${error}`);
    }
  }

  /**
   * Saves clipboard content to a file and returns metadata
   */
  async saveContentToFile(content: ClipboardContent, registerId: RegisterId): Promise<RegisterMetadata> {
    const validatedRegisterId = validateRegisterId(registerId);
    const uuid = randomUUID();

    try {
      await this.ensureContentDirectory();

      const timestamp = Date.now();
      let fileName: string;
      let originalFileName: string | undefined;
      let filePaths: string[] | undefined;
      let textPreview: string | undefined;

      switch (content.type) {
        case CONTENT_TYPES.TEXT: {
          const validatedText = validateTextContent(content.text);
          fileName = `${uuid}.txt`;
          const filePath = sanitizeFilePath(fileName, this.contentPath);
          await this.writeFileAtomic(filePath, validatedText);
          textPreview = createTextPreview(validatedText);
          break;
        }

        case CONTENT_TYPES.HTML: {
          const validatedHtml = validateHtmlContent(content.html, content.text);
          fileName = `${uuid}.json`;
          const filePath = sanitizeFilePath(fileName, this.contentPath);
          const htmlData = { html: validatedHtml.html, text: validatedHtml.text };
          await this.writeFileAtomic(filePath, JSON.stringify(htmlData));
          textPreview = validatedHtml.text ? createTextPreview(validatedHtml.text) : undefined;
          break;
        }

        case CONTENT_TYPES.FILE: {
          const validatedPaths = validateFilePaths(content.filePaths);
          fileName = `${uuid}.json`;
          filePaths = validatedPaths;
          const filePath = sanitizeFilePath(fileName, this.contentPath);
          await this.writeFileAtomic(filePath, JSON.stringify(validatedPaths));
          originalFileName = validatedPaths[0]?.split("/").pop();
          textPreview = `${validatedPaths.length} file(s)`;
          break;
        }

        default:
          throw new RegisterError(`Unsupported content type`, validatedRegisterId);
      }

      return {
        registerId: validatedRegisterId,
        contentType: content.type as ContentType,
        fileName,
        timestamp,
        originalFileName,
        filePaths,
        textPreview,
      };
    } catch (error) {
      throw new FileOperationError(
        `Failed to save content for register ${validatedRegisterId}: ${error}`,
        `${uuid}.${content.type}`,
        validatedRegisterId,
      );
    }
  }

  /**
   * Loads content from file and copies it to clipboard
   */
  async loadContentFromFile(metadata: RegisterMetadata): Promise<void> {
    const filePath = sanitizeFilePath(metadata.fileName, this.contentPath);

    try {
      switch (metadata.contentType) {
        case CONTENT_TYPES.TEXT: {
          const text = await fs.readFile(filePath, "utf-8");
          await Clipboard.copy(text);
          break;
        }

        case CONTENT_TYPES.HTML: {
          const htmlData = JSON.parse(await fs.readFile(filePath, "utf-8"));
          await Clipboard.copy({ html: htmlData.html, text: htmlData.text });
          break;
        }

        case CONTENT_TYPES.FILE: {
          const filePaths = JSON.parse(await fs.readFile(filePath, "utf-8"));
          const validatedPaths = validateFilePaths(filePaths);
          // Copy first file path as file reference
          if (validatedPaths.length > 0) {
            // Ensure we're using the correct file path format
            const cleanPath = fileUriToPath(validatedPaths[0]);
            await Clipboard.copy({ file: cleanPath });
          }
          break;
        }

        default:
          throw new RegisterError(`Unsupported content type: ${metadata.contentType}`, metadata.registerId);
      }
    } catch (error) {
      throw new FileOperationError(
        `Failed to load content from register ${metadata.registerId}: ${error}`,
        filePath,
        metadata.registerId,
      );
    }
  }

  /**
   * Cleans up the file associated with a register
   */
  async cleanupRegisterContent(registerId: RegisterId): Promise<void> {
    const validatedRegisterId = validateRegisterId(registerId);
    const state = await this.getState();
    const metadata = state.registers[validatedRegisterId];

    if (metadata) {
      try {
        const filePath = sanitizeFilePath(metadata.fileName, this.contentPath);
        await fs.unlink(filePath);
      } catch (error) {
        throw new FileOperationError(
          `Failed to cleanup file for register ${validatedRegisterId}: ${error}`,
          metadata.fileName,
          validatedRegisterId,
        );
      }
    }
  }

  /**
   * Switches to a different register
   */
  async switchToRegister(targetRegister: RegisterId): Promise<void> {
    const validatedTargetRegister = validateRegisterId(targetRegister);

    await this.initializeIfNeeded();

    const state = await this.getState();

    // If switching to the same register, do nothing
    if (state.activeRegister === validatedTargetRegister) {
      await showToast({
        style: Toast.Style.Success,
        title: `Register ${validatedTargetRegister}`,
        message: "Already active",
      });
      return;
    }

    try {
      // Step 1: Save current clipboard content to the current active register
      const currentContent = await this.getCurrentClipboardContent();
      if (currentContent) {
        // Clean up previous content for current register
        await this.cleanupRegisterContent(state.activeRegister);

        // Save current content
        state.registers[state.activeRegister] = await this.saveContentToFile(currentContent, state.activeRegister);
      }

      // Step 2: Load target register content to clipboard
      const targetMetadata = state.registers[validatedTargetRegister];
      if (targetMetadata) {
        await this.loadContentFromFile(targetMetadata);
        await showToast({
          style: Toast.Style.Success,
          title: `Register ${validatedTargetRegister}`,
          message: `Loaded ${targetMetadata.contentType} content from ${new Date(targetMetadata.timestamp).toLocaleTimeString()}`,
        });
      } else {
        // Target register is empty - clear clipboard
        await Clipboard.clear();
        await showToast({
          style: Toast.Style.Success,
          title: `Register ${validatedTargetRegister}`,
          message: "Register is empty - clipboard cleared",
        });
      }

      // Step 3: Update active register
      state.activeRegister = validatedTargetRegister;
      await this.setState(state);
    } catch (error) {
      console.error("Failed to switch register:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Register Switch Failed",
        message: String(error),
      });
    }
  }

  /**
   * Clears a register and its associated file
   */
  async clearRegister(registerId: RegisterId): Promise<void> {
    const validatedRegisterId = validateRegisterId(registerId);

    await this.initializeIfNeeded();

    const state = await this.getState();
    const metadata = state.registers[validatedRegisterId];

    if (!metadata) {
      await showToast({
        style: Toast.Style.Success,
        title: `Register ${validatedRegisterId}`,
        message: "Register is already empty",
      });
      return;
    }

    try {
      // Clean up the file
      await this.cleanupRegisterContent(validatedRegisterId);

      // Clear the register in state
      state.registers[validatedRegisterId] = null;

      // If we're clearing the active register, clear the clipboard too
      if (state.activeRegister === validatedRegisterId) {
        await Clipboard.clear();
      }

      await this.setState(state);

      await showToast({
        style: Toast.Style.Success,
        title: `Register ${validatedRegisterId}`,
        message: "Register cleared",
      });
    } catch (error) {
      console.error("Failed to clear register:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Clear Failed",
        message: String(error),
      });
    }
  }

  /**
   * Gets display data for the overview component
   */
  async getRegisterDisplayData(): Promise<RegisterDisplayData> {
    await this.initializeIfNeeded();
    const state = await this.getState();

    return {
      activeRegister: state.activeRegister,
      registers: (REGISTER_IDS as readonly RegisterId[]).map((id) => ({
        id,
        metadata: state.registers[id],
        isActive: state.activeRegister === id,
      })),
    };
  }
}

// Export singleton instance
export const registerManager = RegisterManager.getInstance();
