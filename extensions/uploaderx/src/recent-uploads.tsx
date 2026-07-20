import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { loadRecentUploads, RecentUpload } from "./utils/recentUploads";
import { UploadedFileListItem } from "@/uploaded-links-view";

export default function Command() {
  const [uploads, setUploads] = useState<(RecentUpload & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const arr = await loadRecentUploads();
      // Add unique IDs to existing uploads that don't have them (for backward compatibility)
      const uploadsWithIds = arr.map((item) => ({
        ...item,
        id: (item as { id?: string }).id || uuidv4(),
      }));
      setUploads(uploadsWithIds);
      setLoading(false);
    })();
  }, []);

  return (
    <List isLoading={loading} navigationTitle="Recent Uploads" isShowingDetail>
      {uploads.length === 0 ? (
        <List.EmptyView title="No uploads yet" description="Uploaded files will appear here." />
      ) : (
        uploads.map((item) => <UploadedFileListItem key={item.id} link={item} />)
      )}
    </List>
  );
}
