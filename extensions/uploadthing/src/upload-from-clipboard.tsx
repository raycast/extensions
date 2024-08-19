import { Detail } from "@raycast/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useClipboardFiles, useUpload } from "./lib/hooks";
import { filePathsToFile, guardInvalidApiKey } from "./lib/utils";
import { useEffect } from "react";
import { FileGrid } from "./lib/file-grid";

const queryClient = new QueryClient();
export default () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Command />
    </QueryClientProvider>
  );
};

const Command = () => {
  const { upload, uploadedFiles, uploading } = useUpload();
  const { files, readingClipboard } = useClipboardFiles();

  useEffect(() => {
    if (!files) return;
    filePathsToFile(files).then(upload);
  }, [files]);

  const keyCheck = guardInvalidApiKey();
  if (keyCheck) return keyCheck;

  if (!files || readingClipboard) {
    return (
      <Detail
        isLoading={readingClipboard}
        markdown={
          readingClipboard
            ? null
            : `## The contents of your clipboard is not a file. Copy a file to your clipboard and try again.`
        }
      />
    );
  }

  if (uploading) {
    let markdown = `## Uploading ${files.length} files to UploadThing:\n\n`;
    markdown += files.map((file) => `- ${file}`).join("\n");
    return <Detail isLoading markdown={markdown} />;
  }

  return <FileGrid files={uploadedFiles} />;
};
