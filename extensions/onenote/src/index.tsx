import { getListItems } from "./directory";


export default function Command() {
  var query = "SELECT * FROM Entities ORDER BY RecentTime DESC;" ;
  return getListItems(query);
}; 


