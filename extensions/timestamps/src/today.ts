import { Clipboard } from "@raycast/api";

export default async function today() {
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const dayOfMonth = date.getDate().toString().padStart(2, "0");
  const dayOfWeek = date.toDateString().substring(0, 3);
  const str = `${year}-${month}-${dayOfMonth} ${dayOfWeek}`;

  await Clipboard.paste(str);
}
