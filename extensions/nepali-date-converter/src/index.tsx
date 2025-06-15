import { updateCommandMetadata } from "@raycast/api";
import NepaliDate from "nepali-date-converter";

export default async function convertToBS() {
  const bsDate = new NepaliDate().format("ddd, DD MMMM YYYY");
  await updateCommandMetadata({ subtitle: bsDate });
}
