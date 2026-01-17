import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  List,
  Toast,
  getSelectedFinderItems,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  checkServerConnection,
  fetchModels,
  isImageFile,
  renameImage,
} from "./lib/lmstudio";

/**
 * Represents a model available in LM Studio.
 */
interface Model {
  /** Unique identifier for the model. */
  id: string;
  /** The object type (always "model"). */
  object: string;
  /** The owner or source of the model. */
  owned_by: string;
}

/**
 * Represents an image file selected for processing.
 */
interface ImageFile {
  /** The full path to the image file. */
  path: string;
  /** The filename of the image. */
  name: string;
}

/**
 * Represents the result of processing a single image.
 */
interface ProcessingResult {
  /** The original filename before renaming. */
  oldName: string;
  /** The new filename after renaming (if successful). */
  newName?: string;
  /** The current processing status. */
  status: "pending" | "processing" | "success" | "error" | "skipped";
  /** Error message if processing failed or was skipped. */
  error?: string;
}

/**
 * Main command component that initializes the extension.
 * Checks server connection, fetches models, and gets selected images.
 * @returns The appropriate view based on initialization state.
 */
export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [images, setImages] = useState<ImageFile[]>([]);

  useEffect(() => {
    /**
     * Initializes the extension by checking server connection,
     * fetching available models, and getting selected Finder items.
     */
    async function init() {
      try {
        // Check server connection
        const isConnected = await checkServerConnection();
        if (!isConnected) {
          setError(
            "Cannot connect to LM Studio server.\n\nMake sure LM Studio is running and the local server is started (default: http://localhost:1234).\n\nYou can change the server URL in the extension preferences.",
          );
          setIsLoading(false);
          return;
        }

        // Fetch models
        const availableModels = await fetchModels();
        if (availableModels.length === 0) {
          setError(
            "No models loaded in LM Studio.\n\nPlease load a vision model in LM Studio first.",
          );
          setIsLoading(false);
          return;
        }
        setModels(availableModels);

        // Get selected Finder items
        const finderItems = await getSelectedFinderItems();

        const imageFiles = finderItems.flatMap((item) =>
          isImageFile(item.path)
            ? [
                {
                  path: item.path,
                  name: item.path.split("/").pop() || item.path,
                },
              ]
            : [],
        );

        if (imageFiles.length === 0) {
          setError(
            "No images selected.\n\nSelect one or more image files in Finder, then run this command.\n\nSupported formats: JPG, PNG, GIF, WebP, BMP, TIFF",
          );
          setIsLoading(false);
          return;
        }

        setImages(imageFiles);
        setIsLoading(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "An unknown error occurred");
        setIsLoading(false);
      }
    }

    init();
  }, []);

  if (isLoading) {
    return <Detail isLoading={true} markdown="Connecting to LM Studio..." />;
  }

  if (error) {
    return (
      <Detail
        markdown={`# Error\n\n${error}`}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="Open Lm Studio Docs"
              url="https://lmstudio.ai/docs"
            />
          </ActionPanel>
        }
      />
    );
  }

  return <ModelSelectionForm models={models} images={images} />;
}

/**
 * Form component for selecting a vision model before processing.
 * @param props - Component props.
 * @param props.models - Array of available models to choose from.
 * @param props.images - Array of image files to be processed.
 * @returns A form with model dropdown and submit action.
 */
function ModelSelectionForm({
  models,
  images,
}: {
  models: Model[];
  images: ImageFile[];
}) {
  const { push } = useNavigation();

  /**
   * Handles form submission by navigating to the processing view.
   * @param values - Form values containing the selected model ID.
   */
  function handleSubmit(values: { model: string }) {
    push(<ProcessingView model={values.model} images={images} />);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Start Renaming"
            icon={Icon.Pencil}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Images Selected"
        text={`${images.length} image${images.length === 1 ? "" : "s"} selected`}
      />
      <Form.Dropdown
        id="model"
        title="Vision Model"
        defaultValue={models[0]?.id}
      >
        {models.map((model) => (
          <Form.Dropdown.Item
            key={model.id}
            value={model.id}
            title={model.id}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

/**
 * View component that displays progress while processing images.
 * @param props - Component props.
 * @param props.model - The model ID to use for image analysis.
 * @param props.images - Array of image files to process.
 * @returns A list showing the status of each image being processed.
 */
function ProcessingView({
  model,
  images,
}: {
  model: string;
  images: ImageFile[];
}) {
  const [results, setResults] = useState<ProcessingResult[]>(
    images.map((img) => ({
      oldName: img.name,
      status: "pending",
    })),
  );
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    /**
     * Processes all images sequentially, updating status as each completes.
     */
    async function processImages() {
      let successCount = 0;

      for (let i = 0; i < images.length; i++) {
        const image = images[i];

        // Update status to processing
        setResults((prev) => {
          const updated = [...prev];
          updated[i] = { ...updated[i], status: "processing" };
          return updated;
        });

        // Process the image
        const result = await renameImage(image.path, model);

        // Track successes locally
        if (result.success) {
          successCount++;
        }

        // Update with result
        setResults((prev) => {
          const updated = [...prev];
          if (result.success) {
            if (result.error === "Name unchanged") {
              updated[i] = {
                oldName: result.oldName,
                newName: result.newName,
                status: "skipped",
                error: "Name unchanged",
              };
            } else {
              updated[i] = {
                oldName: result.oldName,
                newName: result.newName,
                status: "success",
              };
            }
          } else {
            updated[i] = {
              oldName: result.oldName,
              status: "error",
              error: result.error,
            };
          }
          return updated;
        });
      }

      setIsProcessing(false);

      // Show completion toast
      await showToast({
        style: Toast.Style.Success,
        title: "Processing Complete",
        message: `Renamed ${successCount} of ${images.length} images`,
      });
    }

    processImages();
  }, []);

  /**
   * Returns the appropriate icon for a given processing status.
   * @param status - The current status of the processing result.
   * @returns The Raycast Icon corresponding to the status.
   */
  const getIcon = (status: ProcessingResult["status"]) => {
    switch (status) {
      case "pending":
        return Icon.Circle;
      case "processing":
        return Icon.CircleProgress;
      case "success":
        return Icon.CheckCircle;
      case "skipped":
        return Icon.MinusCircle;
      case "error":
        return Icon.XMarkCircle;
    }
  };

  /**
   * Returns the list item accessories based on the processing result.
   * @param result - The processing result for an image.
   * @returns Array of accessories to display on the list item.
   */
  const getAccessories = (result: ProcessingResult): List.Item.Accessory[] => {
    if (result.status === "success" && result.newName) {
      return [{ text: `→ ${result.newName}`, icon: Icon.ArrowRight }];
    }
    if (result.status === "error") {
      return [{ text: result.error || "Failed", icon: Icon.ExclamationMark }];
    }
    if (result.status === "skipped") {
      return [{ text: "Unchanged", icon: Icon.Minus }];
    }
    if (result.status === "processing") {
      return [{ text: "Processing...", icon: Icon.CircleProgress }];
    }
    return [];
  };

  const completedCount = results.filter(
    (r) => r.status !== "pending" && r.status !== "processing",
  ).length;

  return (
    <List
      isLoading={isProcessing}
      navigationTitle={`Processing ${completedCount}/${images.length}`}
    >
      <List.Section
        title={`Renaming Images (${completedCount}/${images.length})`}
      >
        {results.map((result, index) => (
          <List.Item
            key={index}
            icon={getIcon(result.status)}
            title={result.oldName}
            accessories={getAccessories(result)}
          />
        ))}
      </List.Section>
    </List>
  );
}
