import axios from "axios";

export const axiosGetImageArrayBuffer = async (url: string) => {
  const res = await axios({
    url: url,
    method: "GET",
    responseType: "arraybuffer",
  });
  return res.data;
};
