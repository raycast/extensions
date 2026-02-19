import { ActionPanel, Form, Action, showToast, Toast, showHUD } from "@raycast/api";
import { useState, useEffect } from "react";
import { S3Manager } from "./lib/s3-manager";
import { S3ErrorHandler } from "./lib/error-handler";
import { ProfileManager } from "./lib/profile-manager";
import { ConnectionProfile, S3Bucket } from "./types";

export default function UploadFiles() {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [selectedBucket, setSelectedBucket] = useState("");
  const [objectPrefix, setObjectPrefix] = useState("");
  const [acl, setAcl] = useState<"private" | "public-read">("private");
  const [buckets, setBuckets] = useState<S3Bucket[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<ConnectionProfile | null>(null);

  const s3Manager = new S3Manager();

  useEffect(() => {
    loadBuckets();
  }, []);

  async function loadBuckets() {
    try {
      // Get default profile
      const defaultProfile = await ProfileManager.getDefaultProfile();

      if (!defaultProfile) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No Profile Found",
          message: "Please configure an AWS profile first",
        });
        return;
      }

      setCurrentProfile(defaultProfile);

      // Load available buckets
      const bucketList = await s3Manager.listBuckets(defaultProfile.id);
      setBuckets(bucketList);

      // Set default bucket if available
      if (bucketList.length > 0) {
        setSelectedBucket(bucketList[0].name);
      }
    } catch (error) {
      const userError = S3ErrorHandler.handle(error as Error);
      await showToast({
        style: Toast.Style.Failure,
        title: userError.title,
        message: userError.message,
      });
    }
  }

  async function startUpload() {
    if (!selectedFiles || selectedFiles.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Files Selected",
        message: "Please select at least one file to upload",
      });
      return;
    }

    if (!selectedBucket) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Bucket Selected",
        message: "Please select a destination bucket",
      });
      return;
    }

    try {
      setIsUploading(true);

      const totalFiles = selectedFiles.length;
      let completedFiles = 0;

      await showToast({
        style: Toast.Style.Animated,
        title: "Starting Upload",
        message: `Uploading ${totalFiles} file(s) to ${selectedBucket}...`,
      });

      for (const filePath of selectedFiles) {
        try {
          // Extract filename from path
          const fileName = filePath.split("/").pop() || "unknown-file";
          const s3Key = objectPrefix ? `${objectPrefix}${fileName}` : fileName;

          if (currentProfile) {
            await s3Manager.uploadFile(currentProfile.id, selectedBucket, filePath, s3Key);
            completedFiles++;

            // Update progress
            await showToast({
              style: Toast.Style.Animated,
              title: "Uploading files...",
              message: `${completedFiles}/${totalFiles} completed`,
            });
          }
        } catch (error) {
          console.error(`Failed to upload ${filePath}:`, error);
          // Continue with other files
        }
      }

      if (completedFiles === totalFiles) {
        await showHUD(`Successfully uploaded ${completedFiles} file(s) to ${selectedBucket}`);

        // Reset form
        setSelectedFiles([]);
        setObjectPrefix("");
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Partial Upload Failure",
          message: `${completedFiles}/${totalFiles} files uploaded successfully`,
        });
      }
    } catch (error) {
      const userError = S3ErrorHandler.handle(error as Error);
      await showToast({
        style: Toast.Style.Failure,
        title: userError.title,
        message: userError.message,
      });
    } finally {
      setIsUploading(false);
    }
  }

  function formatPrefix(prefix: string): string {
    // Ensure prefix ends with / if not empty
    if (prefix && !prefix.endsWith("/")) {
      return prefix + "/";
    }
    return prefix;
  }

  function showDetailedProgress() {
    // This would show a detailed progress view
    console.log("Show detailed upload progress");
  }

  return (
    <Form
      navigationTitle="Upload Files to S3"
      isLoading={isUploading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Upload" onSubmit={startUpload} icon="upload-icon" />
          {isUploading && <Action title="View Progress" onAction={showDetailedProgress} />}
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="files"
        title="Select Files"
        allowMultipleSelection={true}
        value={selectedFiles}
        onChange={setSelectedFiles}
        canChooseFiles={true}
        canChooseDirectories={false}
      />

      <Form.Dropdown
        id="bucket"
        title="Destination Bucket"
        value={selectedBucket}
        onChange={setSelectedBucket}
        storeValue={true}
      >
        {buckets.map((bucket) => (
          <Form.Dropdown.Item key={bucket.name} value={bucket.name} title={bucket.name} />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="prefix"
        title="Object Path Prefix"
        placeholder="uploads/"
        info="Optional prefix to add to uploaded file names (e.g., 'uploads/' will store files in uploads/ folder)"
        value={objectPrefix}
        onChange={(value) => setObjectPrefix(formatPrefix(value))}
      />

      <Form.Dropdown
        id="acl"
        title="Access Control"
        value={acl}
        onChange={(value) => setAcl(value as "private" | "public-read")}
        info="Controls who can access the uploaded files"
      >
        <Form.Dropdown.Item value="private" title="Private (Only you can access)" />
        <Form.Dropdown.Item value="public-read" title="Public Read (Anyone can download)" />
      </Form.Dropdown>

      <Form.Separator />

      <Form.Description
        title="Upload Summary"
        text={`
Files selected: ${selectedFiles.length}
Destination: s3://${selectedBucket}${objectPrefix ? `/${objectPrefix}` : ""}
Access: ${acl === "private" ? "Private" : "Public Read"}
        `}
      />
    </Form>
  );
}
