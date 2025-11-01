import { Form, ActionPanel, Action, showToast, Toast, Icon, popToRoot } from "@raycast/api";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAtom, useAction } from "@reatom/npm-react";
import { useState, useEffect, useMemo } from "react";
import { createAssetSchema } from "./utils/schemas";
import { useContractsQuery } from "./hooks/useContracts";
import { useAccount } from "./hooks/useAccount";
import { createSingleAssetWorkflow } from "./models/single-asset-workflow";
import { FileWithPreview } from "./models/upload-primitives";
import { QueryWrapper } from "./providers/QueryProvider";
import * as fs from "fs";

type FormData = z.infer<typeof createAssetSchema>;

interface NftsCreateProps {
  contractId?: string;
}

function NftsCreateContent({ contractId }: NftsCreateProps) {
  const { data: contractsData, isLoading: contractsLoading } = useContractsQuery();
  const { userId } = useAccount();
  // Create workflow instance
  const workflow = useMemo(() => createSingleAssetWorkflow("nfts-create"), []);

  // Get workflow state
  const [uploadStatus] = useAtom(workflow.statusAtom);
  const [uploadProgress] = useAtom(workflow.progressAtom);
  const [uploadError] = useAtom(workflow.errorAtom);
  // const [_fileId] = useAtom(workflow.fileIdAtom);

  const [isProcessing, setIsProcessing] = useState(false);

  const methods = useForm<FormData>({
    resolver: zodResolver(createAssetSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      contractId: contractId || "",
      editions: 1,
      shareWithCommunity: true,
      mediaFile: [],
    },
    mode: "all",
  });

  const {
    control,
    watch,
    formState: { errors },
  } = methods;
  const selectedContractId = watch("contractId");

  // Find selected contract to determine if editions field is needed
  const selectedContract = useMemo(() => {
    if (!contractsData?.contracts || !selectedContractId) return null;
    return contractsData.contracts.find((c) => c.id === selectedContractId);
  }, [contractsData, selectedContractId]);

  const showEditionsField = selectedContract?.ercType === "ERC1155";

  // Actions
  const setContractAction = useAction(workflow.setContract);
  const setFileAndPrepareAction = useAction(workflow.setFileAndPrepare);
  const finalizeMintAction = useAction(workflow.finalizeMint);

  // Set contract in workflow when selected
  useEffect(() => {
    if (selectedContractId) {
      setContractAction(selectedContractId);
    }
  }, [selectedContractId, setContractAction]);

  const contracts = useMemo(() => {
    if (!contractsData?.contracts) return [];
    // Filter only user's own contracts (not external) - same logic as in web-app
    return contractsData.contracts.filter((contract) => contract.type !== "EXTERNAL" && userId === contract.userId);
  }, [contractsData, userId]);

  const handleSubmit = async (data: FormData) => {
    if (isProcessing) return;

    setIsProcessing(true);

    try {
      // Check if file is selected
      if (!data.mediaFile.length) {
        throw new Error("Please select a media file");
      }

      const filePath = data.mediaFile[0];

      // Read file from filesystem
      if (!fs.existsSync(filePath)) {
        throw new Error("Selected file does not exist");
      }

      const buffer = fs.readFileSync(filePath);
      const stats = fs.statSync(filePath);
      const fileName = filePath.split("/").pop() || "unknown";

      // Detect MIME type based on extension
      const extension = fileName.split(".").pop()?.toLowerCase();
      let mimeType = "application/octet-stream";

      if (extension) {
        const mimeTypes: Record<string, string> = {
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          png: "image/png",
          gif: "image/gif",
          webp: "image/webp",
          svg: "image/svg+xml",
          mp4: "video/mp4",
          webm: "video/webm",
          mov: "video/quicktime",
          mp3: "audio/mpeg",
          wav: "audio/wav",
          pdf: "application/pdf",
        };
        mimeType = mimeTypes[extension] || mimeType;
      }

      // Create File-like object
      const file: FileWithPreview = Object.assign(
        new File([buffer], fileName, {
          type: mimeType,
          lastModified: stats.mtime.getTime(),
        }),
        { preview: filePath },
      );

      showToast({
        style: Toast.Style.Animated,
        title: "Uploading file...",
        message: "Preparing file for upload",
      });

      // Upload file
      await setFileAndPrepareAction(file);

      showToast({
        style: Toast.Style.Animated,
        title: "Creating NFT...",
        message: "Minting your asset",
      });

      // Create NFT
      await finalizeMintAction({
        title: data.title,
        description: data.description || undefined,
        location: data.location || undefined,
        editions: showEditionsField ? data.editions : undefined,
        shareWithCommunity: data.shareWithCommunity,
      });

      showToast({
        style: Toast.Style.Success,
        title: "NFT Created!",
        message: `Your asset has been successfully created`,
      });

      // Navigate back to assets list or show success
      popToRoot();
    } catch (error) {
      console.error("NFT creation error:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to create NFT",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const isLoading =
    contractsLoading ||
    isProcessing ||
    uploadStatus === "preparing" ||
    uploadStatus === "uploading" ||
    uploadStatus === "finalizing";

  // Show upload progress
  const getProgressMessage = () => {
    switch (uploadStatus) {
      case "preparing":
        return "Preparing upload...";
      case "uploading":
        return `Uploading... ${Math.round(uploadProgress * 100)}%`;
      case "finalizing":
        return "Finalizing upload...";
      default:
        return "";
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Nft" onSubmit={handleSubmit} icon={Icon.Plus} />
        </ActionPanel>
      }
    >
      {/* Media File */}
      <Controller
        name="mediaFile"
        control={control}
        render={({ field }) => (
          <Form.FilePicker
            id="mediaFile"
            title="Media File"
            allowMultipleSelection={false}
            canChooseDirectories={false}
            error={errors.mediaFile?.message}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            ref={field.ref}
          />
        )}
      />

      <Form.Separator />

      {/* Collection Selection */}
      <Controller
        name="contractId"
        control={control}
        render={({ field }) => (
          <Form.Dropdown
            id="contractId"
            title="Collection"
            error={errors.contractId?.message}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            ref={field.ref}
          >
            <Form.Dropdown.Item value="" title="Select Collection..." />
            {contracts.map((contract) => (
              <Form.Dropdown.Item
                key={contract.id}
                value={contract.id}
                title={`${contract.name} (${contract.ercType})`}
                icon={contract.status === "COMPLETE" ? Icon.CheckCircle : Icon.Clock}
              />
            ))}
          </Form.Dropdown>
        )}
      />

      <Form.Separator />

      {/* Title */}
      <Controller
        name="title"
        control={control}
        render={({ field }) => (
          <Form.TextField
            id="title"
            title="Title"
            placeholder="Enter NFT title..."
            error={errors.title?.message}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            ref={field.ref}
          />
        )}
      />

      {/* Description */}
      <Controller
        name="description"
        control={control}
        render={({ field }) => (
          <Form.TextArea
            id="description"
            title="Description"
            placeholder="Enter NFT description (optional)..."
            error={errors.description?.message}
            value={field.value || ""}
            onChange={field.onChange}
            onBlur={field.onBlur}
            ref={field.ref}
          />
        )}
      />

      {/* Location */}
      <Controller
        name="location"
        control={control}
        render={({ field }) => (
          <Form.TextField
            id="location"
            title="Location"
            placeholder="Enter location (optional)..."
            error={errors.location?.message}
            value={field.value || ""}
            onChange={field.onChange}
            onBlur={field.onBlur}
            ref={field.ref}
          />
        )}
      />

      {/* Editions (only for ERC1155) */}
      {showEditionsField && (
        <Controller
          name="editions"
          control={control}
          render={({ field }) => (
            <Form.TextField
              id="editions"
              title="Editions"
              placeholder="Enter number of editions (1-1000)..."
              error={errors.editions?.message}
              value={field.value?.toString() || "1"}
              onChange={(value) => {
                const numValue = parseInt(value);
                field.onChange(isNaN(numValue) || numValue < 1 ? 1 : numValue);
              }}
              onBlur={field.onBlur}
              ref={field.ref}
            />
          )}
        />
      )}

      <Form.Separator />

      {/* Share with Community */}
      <Controller
        name="shareWithCommunity"
        control={control}
        render={({ field }) => (
          <Form.Checkbox
            id="shareWithCommunity"
            title="Share with Community"
            label="Make this NFT discoverable by the community"
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            ref={field.ref}
          />
        )}
      />

      {/* Progress indicator */}
      {uploadStatus !== "idle" && uploadStatus !== "completed" && <Form.Description text={getProgressMessage()} />}

      {/* Error display */}
      {uploadError && <Form.Description text={`Error: ${uploadError.message}`} />}
    </Form>
  );
}

export default function NftsCreate(props: { contractId?: string }) {
  return (
    <QueryWrapper>
      <NftsCreateContent contractId={props.contractId} />
    </QueryWrapper>
  );
}
