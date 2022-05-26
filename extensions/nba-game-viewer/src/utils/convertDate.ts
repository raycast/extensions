const convertDate = (date: string): string => {
  const year = date.substring(0, 4);
  const month = date.substring(4, 6);
  const day = date.substring(6, 8);

  return `${month}/${day}/${year}`;
};

export default convertDate;
