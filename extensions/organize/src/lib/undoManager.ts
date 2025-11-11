import * as fs from "fs/promises";
import * as path from "path";

export interface FileOperation {
  type: "move" | "trash";
  originalPath: string;
  newPath?: string; // For moves
  timestamp: number;
}

export class UndoManager {
  private operations: FileOperation[] = [];

  /**
   * Record a file move operation
   */
  recordMove(originalPath: string, newPath: string): void {
    this.operations.push({
      type: "move",
      originalPath,
      newPath,
      timestamp: Date.now(),
    });
  }

  /**
   * Record a file trash operation
   */
  recordTrash(originalPath: string): void {
    this.operations.push({
      type: "trash",
      originalPath,
      timestamp: Date.now(),
    });
  }

  /**
   * Get all recorded operations
   */
  getOperations(): FileOperation[] {
    return [...this.operations];
  }

  /**
   * Get count of operations by type
   */
  getOperationCounts(): { moves: number; trashed: number } {
    return {
      moves: this.operations.filter((op) => op.type === "move").length,
      trashed: this.operations.filter((op) => op.type === "trash").length,
    };
  }

  /**
   * Undo all operations in reverse order
   */
  async undoAll(): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process operations in reverse order
    const reversedOps = [...this.operations].reverse();

    for (const operation of reversedOps) {
      try {
        if (operation.type === "move" && operation.newPath) {
          // Check if file still exists at new location
          try {
            await fs.access(operation.newPath);

            // Try to move it back to original location
            // Check if original location is available
            const originalDir = path.dirname(operation.originalPath);
            await fs.access(originalDir);

            // If original filename exists, we can't move back exactly
            try {
              await fs.access(operation.originalPath);
              results.errors.push(
                `Cannot restore ${path.basename(operation.originalPath)}: original location occupied`,
              );
              results.failed++;
              continue;
            } catch {
              // Original location is free, move back
              await fs.rename(operation.newPath, operation.originalPath);
              results.success++;
            }
          } catch {
            // File no longer exists at new location, skip
            results.errors.push(`Cannot undo: ${path.basename(operation.newPath || "")} no longer exists`);
            results.failed++;
          }
        } else if (operation.type === "trash") {
          // We can't restore from trash programmatically in a reliable way
          results.errors.push(`Cannot restore from Trash: ${path.basename(operation.originalPath)}`);
          results.failed++;
        }
      } catch (error) {
        results.errors.push(
          `Error undoing ${operation.originalPath}: ${error instanceof Error ? error.message : String(error)}`,
        );
        results.failed++;
      }
    }

    return results;
  }

  /**
   * Clear all recorded operations
   */
  clear(): void {
    this.operations = [];
  }
}
