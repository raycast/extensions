const convertDate = (date: string): string => {
  const year = date.substring(0, 4);
  const month = date.substring(4, 6);
  const day = date.substring(6, 8);

  const newDate = new Date(`${year}-${month}-${day}`);
  return newDate.toLocaleDateString();
};

export default convertDate;
