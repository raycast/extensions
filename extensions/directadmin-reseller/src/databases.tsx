import GetDatabasesComponent from "./components/databases/GetDatabasesComponent";
import InvalidUrlComponent from "./components/InvalidUrlComponent";
import { isInvalidUrl } from "./utils/functions";

export default function Databases() {
  if (isInvalidUrl()) return <InvalidUrlComponent />;
  return <GetDatabasesComponent />;
}
