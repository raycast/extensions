export function convertDateString(dateString: string) {
  return new Date(dateString).getTime() / 1000;
}

export function convertTimestamp(timestamp: number) {
  const date = new Date(timestamp * 1000); // Convert Unix timestamp date
  const year = date.toLocaleString("default", { year: "numeric" });
  const month = date.toLocaleString("default", { month: "2-digit" });
  const day = date.toLocaleString("default", { day: "2-digit" });
  const hours = ("0" + date.getHours()).slice(-2); // Get hours component and pad with "0" if needed
  const minutes = ("0" + date.getMinutes()).slice(-2); // Get minutes component and pad with "0" if needed
  const seconds = ("0" + date.getSeconds()).slice(-2); // Get seconds component and pad with "0" if needed

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
