import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { recentExcelFiles } from "./lib/office";
import { ExcelListItem } from "./components/excel/list";

export default function RecentExcelFiles() {
  const { data, isLoading } = useCachedPromise(async () => recentExcelFiles(), []);
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Recent Excel Documents...">
      {data?.files?.map((file) => (
        <ExcelListItem key={file.filename} file={file} executable={data.excelExecutable} />
      ))}
    </List>
  );
}
