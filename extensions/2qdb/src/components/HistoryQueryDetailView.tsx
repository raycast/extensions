import { List } from "@raycast/api";
import useConfigData from "@src/hooks/useConfigData";
import { IQueryHistory } from "@src/interface";
import { convertArrayToTableString } from "@src/util";
import { useMemo } from "react";

export const AnswerDetailView = (props: { queryHistory: IQueryHistory }) => {
  const { queryHistory } = props;
  const { data: databaseList } = useConfigData();

  const configDB = useMemo(() => {
    const foundConfig = databaseList?.dbConfigs.find(
      item => item.id == queryHistory.configID
    );
    return foundConfig;
  }, [queryHistory.id, databaseList]);

  const content = convertArrayToTableString(queryHistory?.result);
  const markdown = `[${configDB?.databaseType}] [${configDB?.database}] [${configDB?.env}]
  ---  
  **${queryHistory.query.trimEnd()}**\n\n${content}`;

  return <List.Item.Detail markdown={markdown} />;
};
