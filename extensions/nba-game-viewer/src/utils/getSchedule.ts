import axios from "axios";

type GetScheduleArgs = {
  league: string;
  year: number;
  month: number;
  day: number;
};

const getSchedule = async ({ league, year, month, day }: GetScheduleArgs) => {
  const baseUrl = `https://cdn.espn.com/core/${league}/schedule?dates=${year}${month <= 9 ? "0" + month : month}${
    day <= 9 ? "0" + day : day
  }`;
  const params = {
    xhr: 1,
    render: false,
    device: "desktop",
    userab: 18,
  };

  const res = await axios.get(baseUrl, { params });
  return res.data.content.schedule;
};

export default getSchedule;
