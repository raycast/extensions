const formatTime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const mins = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const secs = String(Math.floor(seconds % 60)).padStart(2, "0");
  return `${hours === 0 ? "" : hours + ":"}${mins}:${secs}`;
};

const formatDateTime = (d: Date) => {
  const parsedDate = new Date(d);
  const datevalues = [
    parsedDate.getFullYear().toString(),
    (parsedDate.getMonth() + 1).toString().padStart(2, "0"),
    parsedDate.getDate().toString().padStart(2, "0"),
  ];
  const timevalues = [parsedDate.getHours(), parsedDate.getMinutes(), parsedDate.getSeconds()].map((x) =>
    x.toString().padStart(2, "0"),
  );
  const date = datevalues.join("-");
  const time = timevalues.join(":");
  return `${date} ${time}`;
};

const secondsBetweenDates = (args: { d1?: Date | string; d2?: Date | string }) => {
  args.d1 = args.d1 == "----" ? undefined : args.d1;
  args.d2 = args.d2 == "----" ? undefined : args.d2;
  return (
    Math.round(
      (args.d1 ? new Date(args.d1) : new Date()).getTime() - (args.d2 ? new Date(args.d2) : new Date()).getTime(),
    ) / 1000
  );
};

export { formatTime, formatDateTime, secondsBetweenDates };
