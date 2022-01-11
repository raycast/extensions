import UtilListView from "./views/util-list-view";
import allUtils from "./utils";
import useStats from "./use-stats";

export default () => {
  const utils = Object.values(allUtils);
  const stats = useStats();
  utils.sort((a, b) => {
    if (a.name > b.name) {
      return 1;
    }
    if (a.name < b.name) {
      return -1;
    }
    return 0;
  });
  return <UtilListView utils={utils} stats={stats} />;
};
