// iA Writer SDK with Discriminated Union

/**
 * Modes for writing to a file
 */
type WriteMode =
  | "create" // Adjusts last path component to avoid replacing existing file
  | "replace" // Replaces an existing file
  | "add" // Adds text to existing file or creates if not exists
  | "patch"; // Detects differences and attributes edits

/**
 * Location for adding text when mode is 'add'
 */
type AddLocation =
  | "beginning" // Add text at the beginning of file
  | "end"; // Add text at the end of file (default)

/**
 * Padding type for adding text when mode is 'add'
 */
type AddPadding =
  | "sentence" // Add text as a sentence
  | "line" // Add text as a line (default)
  | "paragraph"; // Add text as a paragraph (default)

/**
 * Parameters for the write command
 */
interface IAWriterWriteParams {
  /**
   * Command type (discriminator)
   */
  command: "write";

  /**
   * Authentication token (required)
   */
  authToken: string;

  /**
   * Library path for the file (required)
   */
  path: string;

  /**
   * Text to write (optional)
   */
  text?: string;

  /**
   * Writing mode (optional, default: 'create')
   */
  mode?: WriteMode;

  /**
   * Location to add text when mode is 'add' (optional)
   */
  addLocation?: AddLocation;

  /**
   * Padding type when adding text (optional)
   */
  addPadding?: AddPadding;

  /**
   * Author attribution (optional)
   */
  author?: string;
}

/**
 * Parameters for the open command
 */
interface IAWriterOpenParams {
  /**
   * Command type (discriminator)
   */
  command: "open";

  /**
   * Library path for the file to open (required)
   */
  path: string;

  /**
   * Edit mode for iOS/iPadOS (optional, default: false)
   * If true, keyboard will be shown
   */
  edit?: boolean;

  /**
   * New window mode for macOS (optional, default: false)
   * If true, will open the document in a new window
   */
  newWindow?: boolean;
}

/**
 * Union type for all possible iA Writer command parameters
 */
type IAWriterParams = IAWriterWriteParams | IAWriterOpenParams;

/**
 * Generate iA Writer command URL
 * @param params Parameters for writing to or opening a file
 * @returns Constructed URL scheme string
 */
export function iAWriter(params: IAWriterParams): string {
  switch (params.command) {
    case "write": {
      // Validate required parameters
      if (!params.authToken) {
        throw new Error("Authentication token is required");
      }
      if (!params.path) {
        throw new Error("File path is required");
      }

      const baseUrl = "ia-writer://x-callback-url/write";
      const queryParams = new URLSearchParams({
        "auth-token": params.authToken,
        path: params.path,
      });

      // Optional parameters
      if (params.text) {
        queryParams.append("text", params.text);
      }

      if (params.mode) {
        queryParams.append("mode", params.mode);
      }

      if (params.mode === "add") {
        if (params.addLocation) {
          queryParams.append("add-location", params.addLocation);
        }
        if (params.addPadding) {
          queryParams.append("add-padding", params.addPadding);
        }
      }

      if (params.author) {
        queryParams.append("author", params.author);
      }

      return `${baseUrl}?${queryParams.toString()}`;
    }

    case "open": {
      // Validate required parameters
      if (!params.path) {
        throw new Error("File path is required");
      }

      const baseUrl = "ia-writer://x-callback-url/open";
      const queryParams = new URLSearchParams({
        path: params.path,
      });

      // Optional parameters
      if (params.edit !== undefined) {
        queryParams.append("edit", params.edit.toString());
      }

      if (params.newWindow !== undefined) {
        queryParams.append("new-window", params.newWindow.toString());
      }

      return `${baseUrl}?${queryParams.toString()}`;
    }
  }
}
