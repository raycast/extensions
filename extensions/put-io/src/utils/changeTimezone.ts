const changeTimezone = (date: Date, ianatz: string) => {
  // suppose the date is 12:00 UTC
  const invdate = new Date(
    date.toLocaleString("en-US", {
      timeZone: ianatz,
    })
  );

  // then invdate will be 07:00 in Toronto
  // and the diff is 5 hours
  const diff = date.getTime() - invdate.getTime();

  // so 12:00 in Toronto is 17:00 UTC
  return new Date(date.getTime() - diff); // needs to substract
};

export default changeTimezone;
