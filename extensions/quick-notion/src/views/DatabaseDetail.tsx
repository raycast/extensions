import { Detail } from "@raycast/api";
import { useMemo, VFC } from "react";
import { useDatabaseList } from "src/hooks/useDatabaseList";

export const DatabaseDetail: VFC<{ databaseId: string }> = ({ databaseId }) => {
  const { databaseList } = useDatabaseList();
  const markdown = useMemo(() => {
    const database = databaseList.find((database) => database.id === databaseId);
    if (!database) return "# Not found";

    return `# ${database.title}\n\nID: ${database.id} \n\nCategories: ${
      database.categories ? database.categories.join(" / ") : "false"
    }\n\nTags: ${database.tags ? database.tags.join(" / ") : "false"}\n\nDate: ${
      database.date ? "true" : "false"
    }\n\nCheck: ${database.check ? "true" : "false"}\n\nLast updated at: ${database.updatedAt}\n\n`;
  }, [databaseId, databaseList]);

  return <Detail markdown={markdown} />;
};
