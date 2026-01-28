import { List, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ENDPOINTS, HEADERS } from "./utils/constants";
import { GcodeFilesResponse } from "./types/files";
import { FileEntry } from "./components/filesList";

export default function Files() {
  const { data, isLoading } = useFetch(ENDPOINTS.getAllFiles, {
    headers: HEADERS,
    async onWillExecute() {
      await showToast({
        title: `Fetching OctoPrint Files...`,
        style: Toast.Style.Animated,
      });
    },
    mapResult(result: GcodeFilesResponse) {
      return {
        data: result.files,
        hasMore: !result,
      };
    },
    async onData() {
      await showToast({
        title: `Successfully fetched files`,
        style: Toast.Style.Success,
      });
    },
    onError(error: Error) {
      showToast({
        title: "Failed to fetch files - OctoPrint instance may be offline",
        message: error.toString(),

        style: Toast.Style.Failure,
      });
    },
    initialData: [],
    keepPreviousData: true,
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder={"Search for files..."} throttle>
      {!isLoading &&
        Array.isArray(data) &&
        data.map((file: GcodeFilesResponse["files"]) => {
          return <FileEntry file={file} key={file.path} />;
        })}
    </List>
  );
}
