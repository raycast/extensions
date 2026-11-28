import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import UploadForm from "./components/upload-form";
import { getFinderFiles } from "./lib/finder";

export default function UploadSelectedFinderFiles() {
  const { data: files, isLoading, error } = usePromise(getFinderFiles);

  if (!files || error || isLoading) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView
          title={isLoading ? "Reading Finder Selection" : "Cannot Read Finder Selection"}
          description={error?.message ?? "Select files in Finder before running this command."}
        />
      </List>
    );
  }

  return <UploadForm initialFiles={files} />;
}
