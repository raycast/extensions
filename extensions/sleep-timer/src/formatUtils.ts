const formatTime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const mins = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const secs = String(Math.floor(seconds % 60)).padStart(2, "0");
  return `${hours}:${mins}:${secs}`;
};

const formatDateTime = (d: Date) => {
  const datevalues = [
    d.getFullYear().toString(),
    d.getMonth().toString().padStart(2, "0"),
    d.getDate().toString().padStart(2, "0"),
  ];
  const timevalues = [d.getHours(), d.getMinutes(), d.getSeconds()].map((x) => x.toString().padStart(2, "0"));
  const date = datevalues.join("-");
  const time = timevalues.join(":");
  return `${date} ${time}`;
};

export { formatTime, formatDateTime };
