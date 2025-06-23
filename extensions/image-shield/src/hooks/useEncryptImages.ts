import { useState, useCallback, useEffect } from "react";
import { PopToRootType, showHUD } from "@raycast/api";
import { type ManifestData } from "image-shield";
import { findImages, getSelectedItems } from "../utils/helpers";
import { encryptImagesWithKey, validateEncryptFiles } from "../lib/imageShield";
import { SettingsFormValues } from "../components/SettingsForm";
import { EncryptImagesFromValues } from "../components/EncryptImagesFrom";
import { dirExists } from "../utils/file";
import { useLoadingState } from "./useLoadingState";
import { MANIFEST_FILE_NAME } from "../constraints";
import { generateFragmentFileName } from "image-shield/dist/utils/helpers";
import { writeEncryptedImage, writeManifest } from "../utils/helpers";

interface SelectedFiles {
  workdir?: string;
  imagePaths?: string[];
  config?: {
    blockSize: number;
    prefix: string;
    encrypted: boolean;
    restoreFileName: boolean;
  };
}

interface UseEncryptImagesResult {
  isLoading: boolean;
  isInstantCall: boolean;
  error?: string;
  data?: { manifest: ManifestData; imageBuffers: Buffer[]; workdir: string | undefined };
  selectedFiles: SelectedFiles;
  initialize: () => Promise<void>;
  handleEncrypt: (imagePathsArg?: string[], workdirArg?: string, secretKey?: string) => Promise<void>;
  handleFormSubmit: (values: EncryptImagesFromValues) => Promise<void>;
}

export function useEncryptImages(settings: SettingsFormValues): UseEncryptImagesResult {
  const { isLoading, error, setError, handleError, setIsLoading, showErrorToast } = useLoadingState();
  const [isInstantCall, setIsInstantCall] = useState(false);
  const [data, setData] = useState<
    { manifest: ManifestData; imageBuffers: Buffer[]; workdir: string | undefined } | undefined
  >();
  const [selectedFiles, setSelectedFiles] = useState<SelectedFiles>({});

  useEffect(() => {
    if (error) {
      showErrorToast("Encrypting failed.", error);
    }
  }, [error]);

  // Handle instant call for encrypted images
  const handleInstantCall = useCallback(async () => {
    if (isInstantCall && data) {
      const { manifest, imageBuffers, workdir } = data;

      await writeManifest(manifest, MANIFEST_FILE_NAME, workdir);
      imageBuffers.forEach(async (imageBuffer, i) => {
        const fileName = generateFragmentFileName(manifest, i);
        await writeEncryptedImage(manifest, imageBuffer, fileName, workdir);
      });
      await showHUD("🎉 All images encrypted successfully!", {
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

      const { imagePaths } = await findImages(filePaths);
      const validated = validateEncryptFiles(imagePaths);

      // If not encrypted, try to encrypt immediately
      if (!settings.encrypted) {
        await handleEncrypt(validated.imagePaths);
      }

      setSelectedFiles({
        imagePaths: validated.imagePaths,
        config: {
          blockSize: Number(settings.blockSize),
          prefix: settings.prefix,
          encrypted: settings.encrypted,
          restoreFileName: settings.restoreFileName,
        },
      });
      setIsLoading(false);
    } catch (e) {
      handleError(e);
    }
  };

  // Form submit handler
  async function handleFormSubmit(values: EncryptImagesFromValues) {
    try {
      setIsLoading(true);
      setError(undefined);
      const { folders, encrypted, outputDir } = values;
      const { imagePaths } = await findImages(folders);

      const workdir = outputDir.length > 0 ? outputDir[0] : undefined;
      if (workdir && !(await dirExists(workdir))) {
        throw new Error(`"${workdir}" does not exist.`);
      }

      const validated = validateEncryptFiles(imagePaths);

      // If not encrypted, try to encrypt immediately
      if (!encrypted) {
        await handleEncrypt(validated.imagePaths, workdir);
      }

      setSelectedFiles({
        imagePaths: validated.imagePaths,
        workdir,
        config: {
          blockSize: Number(settings.blockSize),
          prefix: settings.prefix,
          encrypted,
          restoreFileName: settings.restoreFileName,
        },
      });
      setIsLoading(false);
    } catch (e) {
      handleError(e);
    }
  }

  // Encrypt handler
  const handleEncrypt = useCallback(
    async (imagePathsArg?: string[], workdirArg?: string, secretKey?: string) => {
      setIsLoading(true);
      setError(undefined);
      try {
        const imagePaths = imagePathsArg || selectedFiles.imagePaths;
        const workdir = workdirArg || selectedFiles.workdir;
        const validated = validateEncryptFiles(imagePaths);
        const { manifest, fragmentedImages } = await encryptImagesWithKey(
          {
            blockSize: Number(settings.blockSize),
            prefix: settings.prefix,
            restoreFileName: settings.restoreFileName,
          },
          validated.imagePaths,
          secretKey,
        );
        setData({ manifest, imageBuffers: fragmentedImages, workdir });
        setIsLoading(false);
      } catch (e) {
        handleError(e);
      }
    },
    [selectedFiles, settings],
  );

  return {
    isLoading,
    isInstantCall,
    error,
    data,
    selectedFiles,
    initialize,
    handleEncrypt,
    handleFormSubmit,
  };
}
