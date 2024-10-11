import { Detail } from "@raycast/api";
import NepaliDate from "nepali-date-converter";

export default function convertToBS() {
  const bsDate = new NepaliDate().format("ddd, DD MMMM YYYY");
  return <Detail markdown={`# ${bsDate}`} />;
}
