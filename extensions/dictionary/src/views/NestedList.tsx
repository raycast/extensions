import { List } from "@raycast/api";
import { SearchResultList } from "../components";
import getEngine, { EngineHookProps, DepEngineID } from "../engines";
import { useEngine } from "../hooks";
import { DefItem } from "../types";
type Props = {
  isShowingDetail: boolean;
  engine: DepEngineID;
  defItem: DefItem;
};
const NestedList = (props: Props) => {
  const { isShowingDetail, engine, defItem } = props;
  const activeEngine = getEngine(engine) as EngineHookProps<object, object>;
  const { isLoading, data } = useEngine(defItem.title, activeEngine);
  return (
    <List
      isLoading={isLoading}
      // searchText={defItem.title}
      isShowingDetail={isShowingDetail}
    >
      <SearchResultList data={data} />
    </List>
  );
};
export default NestedList;
