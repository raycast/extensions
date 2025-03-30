import { useState, useEffect, useCallback } from "react";
import { LocalStorage, showToast, Toast } from "@raycast/api";
import { PromptChunk } from "../types"; //
import { v4 as uuidv4 } from "uuid"; //

// Key for storing the chain data in Raycast's LocalStorage
const STORAGE_KEY = "promptChainChunks_v1"; // Added version suffix for future migrations

/**
 * Represents the data needed to create a new chunk.
 */
export interface NewChunkData {
  header: string;
  content: string;
}

/**
 * Custom hook to manage the state of the prompt chain using LocalStorage.
 * Provides state variables (chain, isLoading) and action functions.
 */
export function useChainState() {
  // State for the array of prompt chunks
  const [chain, setChain] = useState<PromptChunk[]>([]);
  // State to indicate if data is being loaded from storage
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load chain from LocalStorage on initial mount
  useEffect(() => {
    async function loadChain() {
      setIsLoading(true);
      try {
        const storedChainJson = await LocalStorage.getItem<string>(STORAGE_KEY);
        if (storedChainJson) {
          const storedChain = JSON.parse(storedChainJson) as PromptChunk[];
          // Optional: Add data validation or migration logic here if needed
          setChain(storedChain);
        } else {
          setChain([]); // Initialize with empty array if nothing is stored
        }
      } catch (error) {
        console.error("Failed to load prompt chain from LocalStorage:", error);
        showToast(Toast.Style.Failure, "Could not load prompt chain");
        setChain([]); // Reset to empty on error
      } finally {
        setIsLoading(false);
      }
    }
    loadChain();
  }, []); // Empty dependency array ensures this runs only once on mount

  // Save chain to LocalStorage whenever it changes
  useEffect(() => {
    // Only save if not in the initial loading phase
    if (!isLoading) {
      try {
        // Attempt to save the current chain state to LocalStorage
        LocalStorage.setItem(STORAGE_KEY, JSON.stringify(chain));
      } catch (error) {
        // Log the error for debugging purposes
        console.error("Failed to save prompt chain state:", error);
        // Optionally, notify the user if saving fails
        // showToast({ style: Toast.Style.Failure, title: "Error saving chain state" });
      }
    }
    // Re-run this effect if the chain or loading state changes
  }, [chain, isLoading]);

  // --- Action Functions ---

  /**
   * Adds a single new chunk to the prompt chain.
   * @param header - The header/description for the chunk (can be empty).
   * @param content - The text content for the chunk.
   */
  const addChunk = useCallback(
    async (header: string, content: string) => {
      if (!content || content.trim() === "") {
        showToast(Toast.Style.Failure, "Cannot add empty content");
        return;
      }
      const newChunk: PromptChunk = {
        id: uuidv4(), // Generate a unique ID
        header: header.trim(), // Trim whitespace from header
        content: content,
        enabled: true, // New chunks are enabled by default
        createdAt: Date.now(),
      };
      // Use functional update to ensure we have the latest state
      setChain((prevChain) => [...prevChain, newChunk]);
      // No async toast here, let the caller handle it if needed
    },
    [], // No dependencies needed for this version
  );

  /**
   * Adds multiple new chunks to the prompt chain efficiently.
   * @param chunksToAdd - An array of objects containing header and content for each chunk.
   */
  const addMultipleChunks = useCallback(
    async (chunksToAdd: NewChunkData[]) => {
      const newChunks: PromptChunk[] = chunksToAdd
        .filter((chunkData) => chunkData.content && chunkData.content.trim() !== "")
        .map((chunkData) => ({
          id: uuidv4(),
          header: chunkData.header.trim(),
          content: chunkData.content,
          enabled: true,
          createdAt: Date.now(),
        }));

      if (newChunks.length === 0) {
        if (chunksToAdd.length > 0) {
          showToast(Toast.Style.Failure, "Cannot add empty content");
        }
        return;
      }

      // Use functional update to ensure we have the latest state
      setChain((prevChain) => [...prevChain, ...newChunks]);

      // Show a single toast for multiple additions
      await showToast(Toast.Style.Success, `${newChunks.length} Template(s) Added`);
    },
    [], // No dependencies needed
  );

  /**
   * Removes a chunk from the chain based on its ID.
   * @param id - The unique ID of the chunk to remove.
   */
  const removeChunk = useCallback(async (id: string) => {
    setChain((prevChain) => prevChain.filter((chunk) => chunk.id !== id));
    await showToast(Toast.Style.Success, "Chunk Removed");
  }, []);

  /**
   * Toggles the enabled status of a chunk based on its ID.
   * @param id - The unique ID of the chunk to toggle.
   */
  const toggleChunk = useCallback(async (id: string) => {
    setChain((prevChain) =>
      prevChain.map((chunk) => (chunk.id === id ? { ...chunk, enabled: !chunk.enabled } : chunk)),
    );
    // Usually, no toast notification is needed for toggling as the UI updates instantly.
  }, []);

  /**
   * Moves a chunk up or down in the list order.
   * @param id - The unique ID of the chunk to move.
   * @param direction - "up" or "down".
   */
  const moveChunk = useCallback((id: string, direction: "up" | "down") => {
    setChain((prevChain) => {
      const index = prevChain.findIndex((chunk) => chunk.id === id);
      if (index === -1) {
        console.error(`Chunk with id ${id} not found for moving.`);
        return prevChain; // Should not happen if UI is correct
      }

      const newIndex = direction === "up" ? index - 1 : index + 1;

      // Check if the move is valid (within array bounds)
      if (newIndex < 0 || newIndex >= prevChain.length) {
        return prevChain; // Cannot move further
      }

      // Create a new array with the swapped elements
      const newChain = [...prevChain];
      // Remove the item from its original position
      const [movedItem] = newChain.splice(index, 1);
      // Insert the item at the calculated new position
      newChain.splice(newIndex, 0, movedItem);

      return newChain;
    });
  }, []);

  /**
   * Clears all chunks from the prompt chain.
   */
  const clearChain = useCallback(async () => {
    setChain([]);
    // Explicitly remove from storage as well for immediate effect if needed elsewhere
    await LocalStorage.removeItem(STORAGE_KEY);
    await showToast(Toast.Style.Success, "Chain Cleared");
  }, []);

  // --- Getter Function for Copying ---

  /**
   * Gets the concatenated content of all enabled chunks, formatted based on preference.
   * @param includeHeaders - Boolean indicating whether to include headers in the output.
   * @returns The formatted string ready for clipboard.
   */
  const getFormattedEnabledChunks = useCallback(
    (includeHeaders: boolean): string => {
      return chain
        .filter((chunk) => chunk.enabled) // Only include enabled chunks
        .map((chunk) => {
          // Format based on preference and if header exists
          if (includeHeaders && chunk.header) {
            return `--- [${chunk.header}] ---\n\n${chunk.content}`;
          } else {
            return chunk.content;
          }
        })
        .join("\n\n"); // Join the formatted chunks with a double newline
    },
    [chain], // Dependency: recalculate if the chain changes
  );

  // Return the state and action functions for components to use
  return {
    chain,
    isLoading,
    addChunk,
    addMultipleChunks, // <-- Export the new function
    removeChunk,
    toggleChunk,
    moveChunk,
    clearChain,
    getFormattedEnabledChunks,
    // If you implement editing, add updateChunk function here
  };
}
