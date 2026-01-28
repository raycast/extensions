import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useSQL } from "@raycast/utils";
import { DB_FILE_PATH } from "../constants";
import { copyImage, saveImage } from "../utils/helpers";
import { dbEntry } from "../types";

type Props = {
  search: string;
  isLoading: boolean;
  setSearch: (search: string) => void;
};
export const ListDetails = ({ isLoading, search, setSearch }: Props) => {
  const { data: results, isLoading: searching } = useSQL(
    DB_FILE_PATH,
    `SELECT * FROM Prediction WHERE prompt LIKE '%${search}%'`
  );
  return (
    <List isShowingDetail isLoading={isLoading || searching} searchText={search} onSearchTextChange={setSearch}>
      {results?.map((result) => {
        const { id, prompt, src } = result as dbEntry;
        const markdown = `
### ${prompt?.trim() ?? "No prompt provided"}

![${prompt?.trim() ?? ""}](${src})`;
        return (
          <List.Item
            key={id}
            title={prompt?.trim() ?? ""}
            detail={<List.Item.Detail markdown={markdown} />}
            actions={
              <ActionPanel>
                <Action icon={Icon.Image} title="Copy Image" onAction={() => copyImage(src)} />
                {prompt && <Action.CopyToClipboard icon={Icon.Text} title="Copy Prompt" content={prompt.trim()} />}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
};
