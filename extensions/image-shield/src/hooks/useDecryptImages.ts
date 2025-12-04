import { useState, useCallback, useEffect } from "react";
import { PopToRootType, showHUD } from "@raycast/api";
import { type ManifestData } from "image-shield";
import pLimit from "p-limit";
import { findManifestAndImages, getSelectedItems } from "../utils/helpers";
import { readManifest, restoreImagesWithKey, validateDecryptFiles } from "../lib/imageShield";
import { useLoadingState } from "./useLoadingState";
import { CONCURRENCY_LIMIT } from "../constraints";
import { generateRestoredFileName, generateRestoredOriginalFileName } from "image-shield/dist/utils/helpers";
import { writeRestoredImage } from "../utils/helpers";

interface SelectedFiles {
  workdir?: string;
  manifest?: ManifestData;
  imagePaths?: string[];
}

interface UseDecryptImagesResult {
  isLoading: boolean;
  isInstantCall: boolean;
  error?: string;
  data?: { manifest: ManifestData; imageBuffers: Buffer[]; workdir: string | undefined };
  selectedFiles: SelectedFiles;
  initialize: () => Promise<void>;
  handleDecrypt: (
    manifestArg?: ManifestData,
    imagePathsArg?: string[],
    workdirArg?: string,
    secretKey?: string,
  ) => Promise<void>;
  handleFormSubmit: (values: { folders: string[] }) => Promise<void>;
}

export function useDecryptImages(): UseDecryptImagesResult {
  const { isLoading, error, setError, handleError, setIsLoading, showErrorToast } = useLoadingState();
  const [isInstantCall, setIsInstantCall] = useState(false);
  const [data, setData] = useState<
    { manifest: ManifestData; imageBuffers: Buffer[]; workdir: string | undefined } | undefined
  >();
  const [selectedFiles, setSelectedFiles] = useState<SelectedFiles>({});

  useEffect(() => {
    if (error) {
      showErrorToast("Decrypting failed.", error);
    }
  }, [error]);

  // Handle instant call for decrypted images
  const handleInstantCall = useCallback(async () => {
    if (isInstantCall && data) {
      const { manifest, imageBuffers, workdir } = data;
      const imageInfos = manifest.images;

      const limit = pLimit(CONCURRENCY_LIMIT);
      await Promise.all(
        imageBuffers.map(async (imageBuffer, i) => {
          return limit(async () => {
            const fileName = generateRestoredOriginalFileName(imageInfos[i]) ?? generateRestoredFileName(manifest, i);
            await writeRestoredImage(manifest, imageBuffer, fileName, workdir);
          });
        }),
      );
      await showHUD("🎉 All images decrypted successfully!", {
        clearRootSearch: true,
        popToRootType: PopToRootType.Immediate,
      });
    }
  }, [isInstantCall, data]);

  useEffect(() => {
    handleInstantCall();
  }, [handleInstantCall]);

  // Initialization logic
  const initialize = async () => {
    try {
      setIsLoading(true);
      setError(undefined);

      const filePaths = await getSelectedItems();
      if (filePaths.length === 0) {
        setIsLoading(false);
        return;
      }

      // If the command is called with selected items from Finder, set isInstantCall to true
      setIsInstantCall(true);

      const { manifestPath, imagePaths, workdir } = await findManifestAndImages(filePaths);
      const manifest = await readManifest(manifestPath);
      const validated = validateDecryptFiles(manifest, imagePaths);

      // If not secure, try to decrypt immediately
      if (!manifest.secure) {
        await handleDecrypt(validated.manifest, validated.imagePaths, workdir, undefined);
      }

      setSelectedFiles({
        workdir,
        manifest: validated.manifest,
        imagePaths: validated.imagePaths,
      });
      setIsLoading(false);
    } catch (e) {
      handleError(e);
    }
  };

  // Form submit handler
  async function handleFormSubmit(values: { folders: string[] }) {
    try {
      setIsLoading(true);
      setError(undefined);
      const { folders } = values;
      const { manifestPath, imagePaths, workdir } = await findManifestAndImages(folders);
      const manifest = await readManifest(manifestPath);
      const validated = validateDecryptFiles(manifest, imagePaths);

      // If not secure, try to decrypt immediately
      if (!manifest.secure) {
        await handleDecrypt(validated.manifest, validated.imagePaths, workdir, undefined);
      }

      setSelectedFiles({
        workdir,
        manifest: validated.manifest,
        imagePaths: validated.imagePaths,
      });
      setIsLoading(false);
    } catch (e) {
      handleError(e);
    }
  }

  // Decrypt handler
  const handleDecrypt = useCallback(
    async (manifestArg?: ManifestData, imagePathsArg?: string[], workdirArg?: string, secretKey?: string) => {
      setIsLoading(true);
      setError(undefined);
      try {
        const manifest = manifestArg || selectedFiles.manifest;
        const imagePaths = imagePathsArg || selectedFiles.imagePaths;
        const workdir = workdirArg || selectedFiles.workdir;
        const validated = validateDecryptFiles(manifest, imagePaths);
        const imageBuffers = await restoreImagesWithKey(validated.imagePaths, validated.manifest, secretKey);
        setData({ manifest: validated.manifest, imageBuffers, workdir });
        setIsLoading(false);
      } catch (e) {
        console.error(e);
        if (e instanceof Error && e.message.includes("error:1C800064") && e.message.includes("bad decrypt")) {
          const errorMessage = "Invalid key or selected files.";
          handleError(errorMessage);
          return;
        }
        handleError(e);
      }
    },
    [selectedFiles],
  );

  return {
    isLoading,
    isInstantCall,
    error,
    data,
    selectedFiles,
    initialize,
    handleDecrypt,
    handleFormSubmit,
  };
}
