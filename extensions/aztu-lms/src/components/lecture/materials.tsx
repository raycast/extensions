import { Action, ActionPanel, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getMaterialById, getMaterialDocumentById, getMaterials } from "@/data/lecture/materials";
import { useState } from "react";
import * as fs from "fs";
import * as path from "path";

type Preferences = {
  downloadPath: string;
};

type DownloadedMaterial = {
  materialId: string;
  filePath: string;
};

export function Materials({ lectureId }: { lectureId: string }) {
  const [downloadedMaterials, setDownloadedMaterials] = useState<DownloadedMaterial[]>([]);

  const { data: materials, isLoading } = useCachedPromise(getMaterials, [lectureId], {
    onError: async () => {
      await showToast({ style: Toast.Style.Failure, title: "Failed to load materials" });
    },
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
    });
  };

  const handleDownloadMaterial = async (materialId: string, materialTitle: string) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Downloading material...",
      message: materialTitle,
    });

    try {
      const material = await getMaterialById(lectureId, materialId);

      if (!material) throw new Error("Failed to download material details");

      const files = Object.values(material.files)
        .filter((file) => file.url && file.name)
        .map((file) => ({ name: file.name!, url: file.url! }));

      if (files.length === 0) {
        toast.style = Toast.Style.Failure;
        toast.title = "No Files Found";
        toast.message = "This material has no files to download";
        return;
      }

      const preferences = getPreferenceValues<Preferences>();
      const downloadPath = preferences.downloadPath;

      if (!downloadPath) {
        throw new Error("Download path not configured");
      }

      if (!fs.existsSync(downloadPath)) {
        fs.mkdirSync(downloadPath, { recursive: true });
      }

      toast.message = `Downloading ${files.length} file${files.length > 1 ? "s" : ""}...`;

      for (const file of files) {
        const fileData = await getMaterialDocumentById(file.url);

        if (!fileData) {
          throw new Error(`Failed to download ${file.name}`);
        }

        const filePath = path.join(downloadPath, file.name);
        const buffer = Buffer.from(fileData);
        fs.writeFileSync(filePath, buffer);
        setDownloadedMaterials((prev) => [...prev, { materialId, filePath }]);
      }

      toast.style = Toast.Style.Success;
      toast.title = "Downloaded Successfully";
      toast.message = `${files.length} file${files.length > 1 ? "s" : ""} downloaded`;
    } catch (error) {
      console.error("Download error:", error);
      toast.style = Toast.Style.Failure;
      toast.title = "Download Failed";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  };

  const getDownloadedMaterial = (materialId: string): DownloadedMaterial | undefined => {
    return downloadedMaterials.find((dm) => dm.materialId === materialId);
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search materials..." navigationTitle="Materials">
      {materials?.reverse().map((material) => {
        const downloaded = getDownloadedMaterial(material.id);
        return (
          <List.Item
            key={material.id}
            icon={Icon.Document}
            title={material.title}
            subtitle={material.creator}
            accessories={[
              { text: formatDate(material.created_at) },
              { icon: downloaded ? Icon.CheckCircle : Icon.Download },
            ]}
            actions={
              <ActionPanel>
                {downloaded ? (
                  <>
                    <Action.Open title="Open File" target={downloaded.filePath} />
                    <Action.ShowInFinder title="Show in File Manager" path={downloaded.filePath} />
                    <Action
                      title="Download Again"
                      icon={Icon.Download}
                      onAction={() => handleDownloadMaterial(material.id, material.title)}
                      shortcut={{ macOS: { modifiers: ["cmd"], key: "d" }, Windows: { modifiers: ["ctrl"], key: "d" } }}
                    />
                  </>
                ) : (
                  <Action
                    title="Download Materials"
                    icon={Icon.Download}
                    onAction={() => handleDownloadMaterial(material.id, material.title)}
                  />
                )}
              </ActionPanel>
            }
          />
        );
      })}
      <List.EmptyView
        icon={Icon.Document}
        title="No Materials Found"
        description="No materials have been uploaded for this lecture yet."
      />
    </List>
  );
}
