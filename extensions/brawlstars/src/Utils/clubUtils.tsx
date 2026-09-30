import Axios from "../services/caller.service";
import { personalAccessToken } from "./preferences";
import { IClubData, emptyClubData } from "../models/IClubData";

const searchClub = async (swName: string) => {
  let clubData: IClubData = emptyClubData;

  await Axios.request({
    method: "GET",
    url: "clubs/%23" + swName,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + personalAccessToken,
    },
  })
    .then((res) => {
      clubData = res.data;
    })
    .catch((err) => {
      throw err;
    });

  return clubData;
};

export { searchClub };
