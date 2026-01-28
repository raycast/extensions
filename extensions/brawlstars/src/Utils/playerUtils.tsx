import Axios from "../services/caller.service";
import { personalAccessToken } from "./preferences";
import { IPlayerData, emptyPlayerData } from "../models/IPlayerData";

const searchPlayer = async (swName: string) => {
  let playerData: IPlayerData = emptyPlayerData;

  await Axios.request({
    method: "GET",
    url: "players/%23" + swName,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + personalAccessToken,
    },
  })
    .then((res) => {
      playerData = res.data;
    })
    .catch((err) => {
      throw err;
    });

  return playerData;
};

export { searchPlayer };
