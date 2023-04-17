import moment from "moment";

const randomDate = () => {
  const maxDate = Date.now();
  const timestamp = Math.floor(Math.random() * maxDate);
  return new Date(timestamp);
};

export const getRandomDate = (format: string) => {
  const date = moment(randomDate()).format(format);
  return date;
};
