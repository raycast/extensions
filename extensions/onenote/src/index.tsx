import { getListItems } from "./directory";

export default function Command() {
  const query = "SELECT * FROM Entities ORDER BY RecentTime DESC;";
  return getListItems(query);
}
