import { action, atom, reatomAsync } from "@reatom/framework";
import { createUploadPrimitives, FileWithPreview } from "./upload-primitives";
import { FileSource, FileType, Metadata_AttributeDto, Metadata_AttributeType } from "../api/types";
import { api } from "../api";

const detectFileType = (mimeType: string): FileType => {
  if (mimeType.startsWith("image/")) {
    if (mimeType === "image/gif") return FileType.Gif;
    return FileType.Image;
  }
  if (mimeType.startsWith("video/")) return FileType.Video;
  return FileType.Unknown;
};

export const createSingleAssetWorkflow = (id: string) => {
  // Create upload primitives
  const uploadPrimitives = createUploadPrimitives(id);

  // Additional workflow-specific state
  const selectedContractAtom = atom<string | null>(null, `${id}.selectedContract`);

  // Helper function to build metadata attributes
  const buildMetaAttributes = (data: {
    title: string;
    description?: string;
    location?: string;
    metaAttributes?: Record<string, unknown>;
  }) => {
    const attributes: Metadata_AttributeDto[] = [];

    // Add title
    attributes.push({
      key: "title",
      value: data.title,
      type: Metadata_AttributeType.STRING,
    });

    // Add description if provided
    if (data.description) {
      attributes.push({
        key: "description",
        value: data.description,
        type: Metadata_AttributeType.STRING,
      });
    }

    // Add location if provided
    if (data.location) {
      attributes.push({
        key: "location",
        value: data.location,
        type: Metadata_AttributeType.STRING,
      });
    }

    // Add global app attributes
    attributes.push({
      key: "appName",
      value: "Uranium Raycast",
      type: Metadata_AttributeType.STRING,
    });

    attributes.push({
      key: "appVersion",
      value: "1.0.0",
      type: Metadata_AttributeType.STRING,
    });

    // Add any custom meta attributes
    if (data.metaAttributes) {
      Object.entries(data.metaAttributes).forEach(([key, value]) => {
        attributes.push({
          key,
          value: String(value),
          type: Metadata_AttributeType.STRING,
        });
      });
    }

    return attributes;
  };

  // Set file and prepare upload
  const setFileAndPrepare = reatomAsync(
    async (ctx, file: FileWithPreview) => {
      try {
        // Detect file type from MIME type
        const fileType = detectFileType(file.type);
        if (!fileType) throw new Error("Failed to detect file type");

        // Reset any previous state
        uploadPrimitives.reset(ctx);

        // Generate metadata
        const metadata = JSON.stringify({
          lastModified: file.lastModified,
          size: file.size,
          type: file.type,
          name: file.name,
        });

        // Prepare upload
        const result = await uploadPrimitives.prepareUpload(ctx, {
          file,
          metadata,
          fileType,
          source: FileSource.Upload,
          deviceId: "raycast-extension", // Simple device ID for Raycast
        });

        // Start upload
        await uploadPrimitives.uploadAllChunks(ctx);

        // Finalize upload
        await uploadPrimitives.finalizeUpload(ctx);

        return result;
      } catch (error) {
        console.error("Upload error:", error);
        throw error;
      }
    },
    { name: `${id}.setFileAndPrepare` },
  );

  // Finalize mint
  const finalizeMint = reatomAsync(
    async (
      ctx,
      payload: {
        editions?: number;
        title: string;
        description?: string;
        location?: string;
        shareWithCommunity: boolean;
      },
    ) => {
      try {
        const fileId = ctx.get(uploadPrimitives.fileIdAtom);
        const contract = ctx.get(selectedContractAtom);

        if (!fileId) throw new Error("File not uploaded");
        if (!contract) throw new Error("Contract not selected");

        const { title, description, location, shareWithCommunity, editions } = payload;

        const response = await api.assets.startMinting({
          fileId,
          editions: editions ? Number(editions) : undefined,
          contractId: contract,
          shareWithCommunity,
          isEncrypted: false, // Not supporting encryption in Raycast for now
          metadata: {
            attributes: buildMetaAttributes({
              title,
              description,
              location,
              metaAttributes: {},
            }),
          },
        });

        if (response.status !== "ok") {
          throw new Error("Failed to finalize mint");
        }

        // Reset state after successful mint
        uploadPrimitives.reset(ctx);
        selectedContractAtom(ctx, null);

        return fileId;
      } catch (error) {
        console.error("Mint error:", error);
        throw error;
      }
    },
    { name: `${id}.finalizeMint` },
  );

  const setContract = action((ctx, contractId: string) => {
    selectedContractAtom(ctx, contractId);
  }, `${id}.setContract`);

  const reset = action((ctx) => {
    uploadPrimitives.reset(ctx);
    selectedContractAtom(ctx, null);
  }, `${id}.reset`);

  return {
    // Upload primitives
    ...uploadPrimitives,

    // Workflow-specific state
    selectedContractAtom,

    // Workflow actions
    setContract,
    setFileAndPrepare,
    finalizeMint,
    reset,
  };
};
