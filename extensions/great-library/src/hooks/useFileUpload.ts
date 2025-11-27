import { Toast, showToast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MAX_FILE_SIZE_BYTES,
  UploadableFile,
  findOversizedFile,
  readFilesMetadata,
  uploadFilesToLibrary,
} from "../lib/upload";

interface UseFileUploadOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface UseFileUploadReturn {
  // State
  files: UploadableFile[];
  isUploading: boolean;
  totalSize: number;

  // Actions
  handleSelectionChange: (selectedPaths: string[] | undefined) => Promise<void>;
  uploadFiles: (paths: string[]) => Promise<void>;
  reset: () => void;
}

/**
 * Custom hook for managing file uploads
 * Handles file selection, validation, and upload process
 */
export function useFileUpload(options: UseFileUploadOptions = {}): UseFileUploadReturn {
  const [files, setFiles] = useState<UploadableFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [lastSelectionSignature, setLastSelectionSignature] = useState<string>("");
  const lastSelectionRef = useRef<string>("");

  // Calculate total size of selected files
  const totalSize = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files]);

  // Reset state when needed (e.g., after successful upload or on mount)
  const reset = useCallback(() => {
    setFiles([]);
    setLastSelectionSignature("");
    lastSelectionRef.current = "";
  }, []);

  // Handle file selection changes
  const handleSelectionChange = useCallback(async (selectedPaths: string[] | undefined) => {
    const paths = selectedPaths ?? [];
    const signature = [...paths].sort().join("|");

    // Store signature to prevent race conditions
    setLastSelectionSignature(signature);
    lastSelectionRef.current = signature;

    // Read file metadata asynchronously
    const metadata = await readFilesMetadata(paths);

    // Only update if this is still the latest selection
    if (lastSelectionRef.current === signature) {
      setFiles(metadata);
    }
  }, []);

  // Main upload function
  const uploadFiles = useCallback(
    async (paths: string[]) => {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Preparing upload",
      });

      try {
        setIsUploading(true);

        // Create signature for current selection
        const currentSignature = [...paths].sort().join("|");

        // Use existing files if signature matches, otherwise read metadata
        let selectedFiles = files;
        if (!selectedFiles.length || currentSignature !== lastSelectionSignature) {
          selectedFiles = await readFilesMetadata(paths);
        }

        // Validation
        if (selectedFiles.length === 0) {
          throw new Error("Please pick at least one file.");
        }

        const oversizeFile = findOversizedFile(selectedFiles);
        if (oversizeFile) {
          throw new Error(
            `${oversizeFile.name} exceeds the ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB limit enforced by Google File Search.`,
          );
        }

        // Update toast with upload progress
        toast.title = "Uploading files";
        toast.message = `${selectedFiles.length} file(s)`;

        // Perform upload with progress tracking
        const { documents: uploadedDocs } = await uploadFilesToLibrary(selectedFiles, {
          onProgressUpdate: (file) => {
            toast.message = `Uploading ${file.name}`;
          },
        });

        // Success
        toast.style = Toast.Style.Success;
        toast.title = "Upload complete";
        toast.message = `${uploadedDocs.length} file(s) ready`;

        // Reset state after successful upload
        reset();

        // Call success callback if provided
        options.onSuccess?.();
      } catch (error) {
        const errorInstance = error instanceof Error ? error : new Error(String(error));

        toast.style = Toast.Style.Failure;
        toast.title = "Upload failed";
        toast.message = errorInstance.message;

        console.error("[useFileUpload] Upload failed", error);

        // Call error callback if provided
        options.onError?.(errorInstance);
      } finally {
        setIsUploading(false);
      }
    },
    [files, lastSelectionSignature, reset, options],
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      lastSelectionRef.current = "";
    };
  }, []);

  return {
    files,
    isUploading,
    totalSize,
    handleSelectionChange,
    uploadFiles,
    reset,
  };
}
