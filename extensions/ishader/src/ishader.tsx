import { Detail, Form, useNavigation, ActionPanel, Action, Clipboard, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect, useRef } from "react";
import fs from "fs";
import path from "path";
import { environment } from "@raycast/api";
import { SHADER_CONFIGS, getShaderConfig } from "./config/shaders";
import { useShaderParameters } from "./hooks/useShaderParameters";
import { ShaderActions } from "./components/ShaderActions";
import { ShaderMetadata } from "./components/ShaderMetadata";
import { StepSizeForm } from "./components/StepSizeForm";
import { SaveImageForm } from "./components/SaveImageForm";
import { ShaderSettingsForm } from "./components/ShaderSettingsForm";
import { processImageWithShader } from "./utils/shaderProcessor";
import { safeDeleteFile, cleanupOldTempFiles } from "./utils/tempFileManager";
import { validateImageFile, validateImageDimensions } from "./utils/fileValidation";

export default function Command() {
  const { push } = useNavigation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [fullOutputPath, setFullOutputPath] = useState<string | null>(null);
  const [inputImagePath, setInputImagePath] = useState<string | null>(null);
  const [previewBase64, setPreviewBase64] = useState<string | null>(null);
  const previewPathRef = useRef<string | null>(null);
  const fullOutputPathRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstLoadRef = useRef<boolean>(true);
  const currentPreviewFilePathRef = useRef<string | null>(null);
  const cancelledRef = useRef<boolean>(false);
  const [originalImageSize, setOriginalImageSize] = useState<{ width: number; height: number } | null>(null);

  // Shader selection
  const [shaderType, setShaderType] = useState<string>("edit");
  const shaderConfig = getShaderConfig(shaderType) || SHADER_CONFIGS[0];

  // Use unified parameter management hook
  const { parameters, setParameter, updateParameters } = useShaderParameters(shaderConfig);

  // UI state
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [imageFiles, setImageFiles] = useState<string[]>([]);
  const [stepSize, setStepSize] = useState<string>("1");

  // Use serialized parameters for stable dependency tracking
  // This avoids the issue of changing array size when switching shaders
  const parametersString = JSON.stringify(parameters);

  // Cleanup old temporary files on mount
  useEffect(() => {
    cleanupOldTempFiles();
  }, []);

  // Cleanup temporary files on unmount
  useEffect(() => {
    return () => {
      // Clear any pending timers
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Mark as cancelled
      cancelledRef.current = true;

      // Cleanup temporary files
      if (previewPathRef.current) {
        safeDeleteFile(previewPathRef.current);
      }
      if (currentPreviewFilePathRef.current) {
        safeDeleteFile(currentPreviewFilePathRef.current);
      }
      // Note: We don't delete fullOutputPathRef here as user might want to save it
    };
  }, []);

  // Auto-apply filter when parameters change (with debounce)
  useEffect(() => {
    if (!inputImagePath || !fs.existsSync(inputImagePath)) {
      return;
    }

    // Skip first render after image load
    if (isFirstLoadRef.current) {
      isFirstLoadRef.current = false;
      setTimeout(() => {
        applyFilterAuto();
      }, 100);
      return;
    }

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce filter application - increased delay for faster parameter switching
    // Allows quick value changes (0-30) and only applies after user stops changing
    debounceTimerRef.current = setTimeout(() => {
      applyFilterAuto();
    }, 800);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [inputImagePath, shaderType, parametersString]);

  async function applyFilterAuto() {
    if (!inputImagePath || !fs.existsSync(inputImagePath) || isProcessing) {
      return;
    }

    cancelledRef.current = false;
    let previewFilePath: string | null = null;

    async function applyFilter() {
      setIsProcessing(true);
      previewFilePath = null;

      try {
        previewFilePath = path.join(environment.supportPath, `preview-${Date.now()}.png`);
        currentPreviewFilePathRef.current = previewFilePath;

        const supportDir = environment.supportPath;
        if (!fs.existsSync(supportDir)) {
          fs.mkdirSync(supportDir, { recursive: true });
        }

        if (!inputImagePath || cancelledRef.current) {
          if (previewFilePath) {
            safeDeleteFile(previewFilePath);
          }
          return;
        }

        const outputPath = await processImageWithShader(shaderType, inputImagePath, parameters, previewFilePath);

        if (cancelledRef.current) {
          // Operation was cancelled, cleanup output file
          safeDeleteFile(outputPath);
          if (previewFilePath) {
            safeDeleteFile(previewFilePath);
          }
          return;
        }

        // Cleanup old preview file if it exists and is different
        if (fullOutputPathRef.current && fullOutputPathRef.current !== outputPath) {
          safeDeleteFile(fullOutputPathRef.current);
        }

        setFullOutputPath(outputPath);
        fullOutputPathRef.current = outputPath;
        currentPreviewFilePathRef.current = null; // Reset after successful processing

        await createPreviewThumbnail(outputPath, zoomScale);
      } catch (error) {
        console.error("Filter application error:", error);

        // Cleanup preview file on error
        if (previewFilePath) {
          safeDeleteFile(previewFilePath);
          currentPreviewFilePathRef.current = null;
        }

        if (!cancelledRef.current) {
          showFailureToast({ title: "Error", message: "Failed to apply filter" });
        }
      } finally {
        if (!cancelledRef.current) {
          setIsProcessing(false);
        }
      }
    }

    applyFilter();

    return () => {
      cancelledRef.current = true;
    };
  }

  async function createPreviewThumbnail(fullImagePath: string, scale: number) {
    let thumbnailPath: string | null = null;

    try {
      const { Jimp } = await import("jimp");
      const fullImage = await Jimp.read(fullImagePath);

      // Validate image dimensions
      const width = fullImage.width;
      const height = fullImage.height;

      // Store original image size for proper aspect ratio display
      // Only update if not already set or if dimensions changed
      setOriginalImageSize((prev) => {
        if (!prev || prev.width !== width || prev.height !== height) {
          return { width, height };
        }
        return prev;
      });

      const dimensionsCheck = validateImageDimensions(width, height);
      if (!dimensionsCheck.valid) {
        console.warn("Image dimensions validation failed:", dimensionsCheck.error);
        // Continue anyway, but log the warning
      }

      const basePreviewSize = 200;
      const maxPreviewSize = Math.round(basePreviewSize * scale);

      let previewWidth = fullImage.width;
      let previewHeight = fullImage.height;

      if (previewWidth > maxPreviewSize || previewHeight > maxPreviewSize) {
        if (previewWidth > previewHeight) {
          previewHeight = Math.round((previewHeight * maxPreviewSize) / previewWidth);
          previewWidth = maxPreviewSize;
        } else {
          previewWidth = Math.round((previewWidth * maxPreviewSize) / previewHeight);
          previewHeight = maxPreviewSize;
        }
      }

      thumbnailPath = path.join(environment.supportPath, `preview-thumb-${Date.now()}.png`);
      const thumbnail = fullImage.clone().resize({ w: previewWidth, h: previewHeight });
      await thumbnail.write(thumbnailPath as `${string}.${string}`);

      // Clean up old preview thumbnail
      const oldPreviewPath = previewPathRef.current;
      if (oldPreviewPath && oldPreviewPath !== thumbnailPath) {
        safeDeleteFile(oldPreviewPath);
      }

      previewPathRef.current = thumbnailPath;
      await updatePreviewBase64(thumbnailPath);
    } catch (error) {
      console.error("Failed to create preview thumbnail:", error);
      // Cleanup thumbnail file on error
      if (thumbnailPath) {
        safeDeleteFile(thumbnailPath);
      }
    }
  }

  async function updatePreviewBase64(imagePath: string) {
    try {
      const imageBuffer = fs.readFileSync(imagePath);
      const base64 = imageBuffer.toString("base64");
      setPreviewBase64(`data:image/png;base64,${base64}`);
    } catch (error) {
      console.error("Failed to convert image to base64:", error);
      setPreviewBase64(null);
    }
  }

  // Handle image file selection automatically
  useEffect(() => {
    if (imageFiles.length > 0 && fs.existsSync(imageFiles[0]) && fs.lstatSync(imageFiles[0]).isFile()) {
      handleImageChange(imageFiles[0]);
    } else if (imageFiles.length === 0 && inputImagePath) {
      handleImageChange(null);
    }
  }, [imageFiles]);

  // Update preview when zoom scale changes
  useEffect(() => {
    if (fullOutputPathRef.current && fs.existsSync(fullOutputPathRef.current) && inputImagePath) {
      createPreviewThumbnail(fullOutputPathRef.current, zoomScale);
    }
  }, [zoomScale]);

  async function handleImageChange(filePath: string | null) {
    // Cleanup temporary files when changing image
    if (previewPathRef.current) {
      safeDeleteFile(previewPathRef.current);
      previewPathRef.current = null;
    }
    if (currentPreviewFilePathRef.current) {
      safeDeleteFile(currentPreviewFilePathRef.current);
      currentPreviewFilePathRef.current = null;
    }
    // Note: Keep fullOutputPathRef for potential save, but reset state
    const oldFullOutput = fullOutputPathRef.current;
    fullOutputPathRef.current = null;

    // Cleanup old temporary files periodically when changing images
    cleanupOldTempFiles();

    if (filePath && fs.existsSync(filePath) && fs.lstatSync(filePath).isFile()) {
      // Validate image file before processing
      const validation = validateImageFile(filePath);
      if (!validation.valid) {
        showFailureToast({
          title: "Invalid Image",
          message: validation.errors.join(", ") || "Image validation failed",
        });
        setInputImagePath(null);
        setFullOutputPath(null);
        setPreviewBase64(null);
        setOriginalImageSize(null);
        return;
      }

      // Load original image dimensions immediately for proper aspect ratio display
      try {
        const { Jimp } = await import("jimp");
        const originalImage = await Jimp.read(filePath);
        setOriginalImageSize({ width: originalImage.width, height: originalImage.height });
      } catch (error) {
        console.warn("Failed to load image dimensions:", error);
        // Continue anyway - dimensions will be set when preview is created
      }

      setInputImagePath(filePath);
      setFullOutputPath(null);
      setPreviewBase64(null);
      setZoomScale(1.0);
      isFirstLoadRef.current = true;

      // Cleanup old output file after a short delay (in case user wants to save it)
      // But only if it's different from what might be saved
      if (oldFullOutput && oldFullOutput !== filePath) {
        setTimeout(() => {
          if (fullOutputPathRef.current !== oldFullOutput) {
            safeDeleteFile(oldFullOutput);
          }
        }, 1000);
      }
    } else {
      setInputImagePath(null);
      setFullOutputPath(null);
      setPreviewBase64(null);
      setZoomScale(1.0);
      setOriginalImageSize(null);
      isFirstLoadRef.current = true;

      // Cleanup old output file when deselecting image
      if (oldFullOutput) {
        setTimeout(() => {
          if (fullOutputPathRef.current !== oldFullOutput) {
            safeDeleteFile(oldFullOutput);
          }
        }, 1000);
      }
    }
  }

  function handleSaveClick() {
    const fullPath = fullOutputPathRef.current || fullOutputPath;
    if (!fullPath || !fs.existsSync(fullPath)) {
      showFailureToast({ title: "Error", message: "No processed image to save" });
      return;
    }
    const imageName = inputImagePath ? path.basename(inputImagePath) : "";
    push(<SaveImageForm fullImagePath={fullPath} onSaved={() => {}} originalFileName={imageName} />);
  }

  function handleShaderChange(newShaderId: string) {
    setShaderType(newShaderId);
    isFirstLoadRef.current = true;
  }

  function handleStepSizeChange() {
    push(
      <StepSizeForm
        currentStepSize={stepSize}
        onStepSizeChanged={(newStepSize) => {
          setStepSize(newStepSize);
        }}
      />,
    );
  }

  function handleShaderSettingsOpen() {
    push(
      <ShaderSettingsForm
        shaderConfig={shaderConfig}
        parameters={parameters}
        onSettingsChanged={(updates) => {
          updateParameters(updates);
        }}
      />,
    );
  }

  async function handlePasteFromClipboard() {
    try {
      const clipboardContent = await Clipboard.read();

      // Check if clipboard contains a file
      if (clipboardContent.file) {
        const filePath = clipboardContent.file;

        // Validate that file exists and is a file (not directory)
        if (!fs.existsSync(filePath)) {
          showFailureToast({ title: "File Not Found", message: "The file in clipboard no longer exists" });
          return;
        }

        if (!fs.lstatSync(filePath).isFile()) {
          showFailureToast({ title: "Invalid Selection", message: "Clipboard contains a directory, not a file" });
          return;
        }

        // Use the existing handleImageChange function to validate and load the image
        await handleImageChange(filePath);
      } else {
        // On Windows, try to save image from clipboard if it's not a file
        // This handles cases where image is copied as image data (e.g., screenshot)
        const isWindows = process.platform === "win32";

        if (isWindows) {
          let tempImagePath: string | null = null;
          try {
            const { runPowerShellScript } = await import("@raycast/utils");
            tempImagePath = path.join(environment.supportPath, `clipboard-image-${Date.now()}.png`);

            // Ensure support directory exists
            if (!fs.existsSync(environment.supportPath)) {
              fs.mkdirSync(environment.supportPath, { recursive: true });
            }

            // Escape path for PowerShell (replace backslashes and quotes)
            const escapedPath = tempImagePath.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

            // PowerShell script to save clipboard image to file
            const script = `
              Add-Type -AssemblyName System.Windows.Forms
              Add-Type -AssemblyName System.Drawing
              
              $image = [System.Windows.Forms.Clipboard]::GetImage()
              if ($image -ne $null) {
                $image.Save("${escapedPath}", [System.Drawing.Imaging.ImageFormat]::Png)
                Write-Output "SUCCESS"
              } else {
                Write-Output "NO_IMAGE"
              }
            `;

            const result = await runPowerShellScript(script, { timeout: 5000 });

            if (result && result.trim() === "SUCCESS" && fs.existsSync(tempImagePath)) {
              await handleImageChange(tempImagePath);
              return;
            } else if (result && result.trim() === "NO_IMAGE") {
              // Clean up temp file if it was created but invalid
              if (tempImagePath && fs.existsSync(tempImagePath)) {
                safeDeleteFile(tempImagePath);
              }
              showFailureToast({
                title: "No Image in Clipboard",
                message: "Please copy an image or image file to clipboard first",
              });
              return;
            }

            // If we get here, something went wrong - clean up temp file
            if (tempImagePath && fs.existsSync(tempImagePath)) {
              safeDeleteFile(tempImagePath);
            }
          } catch (psError) {
            // Clean up temp file on error
            if (tempImagePath && fs.existsSync(tempImagePath)) {
              safeDeleteFile(tempImagePath);
            }
            console.error("PowerShell script error:", psError);
            // Fall through to show error message
          }
        }

        showFailureToast({
          title: "No Image in Clipboard",
          message: "Please copy an image file to clipboard first (right-click file → Copy)",
        });
      }
    } catch (error) {
      console.error("Failed to paste from clipboard:", error);
      showFailureToast({
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to read from clipboard",
      });
    }
  }

  const displaySize = Math.round(200 * zoomScale);
  const imageName = inputImagePath ? path.basename(inputImagePath) : "";

  // Calculate display dimensions maintaining aspect ratio
  let displayWidth = displaySize;
  let displayHeight = displaySize;

  if (originalImageSize) {
    const aspectRatio = originalImageSize.width / originalImageSize.height;
    if (aspectRatio > 1) {
      // Horizontal image
      displayWidth = displaySize;
      displayHeight = Math.round(displaySize / aspectRatio);
    } else {
      // Vertical or square image
      displayHeight = displaySize;
      displayWidth = Math.round(displaySize * aspectRatio);
    }
  }

  // If no image selected, show Form with FilePicker
  if (!inputImagePath) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action
              icon={Icon.Clipboard}
              title="Paste from Clipboard"
              onAction={handlePasteFromClipboard}
              shortcut={{
                macOS: { modifiers: ["cmd"], key: "v" },
                windows: { modifiers: ["ctrl"], key: "v" },
              }}
            />
          </ActionPanel>
        }
      >
        <Form.FilePicker
          id="image"
          title="Select Image File"
          allowMultipleSelection={false}
          canChooseDirectories={false}
          value={imageFiles}
          onChange={setImageFiles}
        />
        <Form.Description
          title=""
          text="Select an image file to start editing. The editor will open automatically once a file is selected."
        />
      </Form>
    );
  }

  // If image selected, show Detail with editor
  const markdown = previewBase64
    ? `![Preview](${previewBase64}?raycast-width=${displayWidth}&raycast-height=${displayHeight})`
    : `Processing...`;

  return (
    <Detail
      isLoading={isProcessing}
      markdown={markdown}
      metadata={
        <ShaderMetadata
          shaderConfig={shaderConfig}
          parameters={parameters}
          imageName={imageName}
          stepSize={stepSize}
          zoomScale={zoomScale}
        />
      }
      actions={
        <ShaderActions
          shaderConfig={shaderConfig}
          allShaderConfigs={SHADER_CONFIGS}
          currentShaderId={shaderType}
          parameters={parameters}
          onParameterChange={setParameter}
          onShaderChange={handleShaderChange}
          stepSize={stepSize}
          onStepSizeChange={(newStepSize) => setStepSize(newStepSize)}
          onStepSizeFormOpen={handleStepSizeChange}
          onShaderSettingsOpen={handleShaderSettingsOpen}
          fullOutputPath={fullOutputPath}
          onSaveClick={handleSaveClick}
          onSelectDifferentImage={() => {
            handleImageChange(null);
            setImageFiles([]);
          }}
          zoomScale={zoomScale}
          onZoomIncrease={() => {
            setZoomScale(Math.min(5.0, zoomScale + 0.25));
          }}
          onZoomDecrease={() => {
            setZoomScale(Math.max(0.25, zoomScale - 0.25));
          }}
          onZoomReset={() => {
            setZoomScale(1.0);
          }}
          onParameterChangeWithStepSize={(id, delta) => {
            const currentValue = Number(parameters[id] || 0);
            const param = shaderConfig.parameters.find((p) => p.id === id);
            if (param) {
              const newValue = currentValue + delta;
              const max = param.max ?? Infinity;
              const min = param.min ?? -Infinity;
              const clampedValue = Math.max(min, Math.min(max, newValue));
              setParameter(id, param.type === "int" ? Math.floor(clampedValue) : clampedValue);
            }
          }}
        />
      }
    />
  );
}
