import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  showTips: boolean;
  layout: string;
  columns: string;
  itemInset: string;
  showDocument: boolean;
  showCode: boolean;
  showScript: boolean;

  createdAction: string;
  nullArgumentsAction: string;
  defaultFileType: string;
  defaultFileContent: string;
  defaultDirectory: string;
}
export const {
  showTips,
  layout,
  columns,
  itemInset,
  showDocument,
  showCode,
  showScript,
  createdAction,
  nullArgumentsAction,
  defaultFileType,
  defaultFileContent,
  defaultDirectory,
} = getPreferenceValues<Preferences>();
