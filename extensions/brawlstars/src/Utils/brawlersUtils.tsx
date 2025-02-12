import Axios from "../services/caller.service";
("../models/IBrawler");
import IBrawlers, { emptyListBrawlersData } from "../models/IBrawler";

const searchListBrawlers = async () => {
  let listBrawlersData: IBrawlers[] = emptyListBrawlersData;

  await Axios.request({
    method: "GET",
    url: "https://api.brawlapi.com/v1/brawlers",
  })
    .then((res) => {
      listBrawlersData = res.data.list;
    })
    .catch((err) => {
      throw err;
    });

  return listBrawlersData;
};

export { searchListBrawlers };
