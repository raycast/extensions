import { open } from "@raycast/api";
import { tracQueryUrl } from "./assets/globals";
import {
  tracColumns,
  tracStates,
  tracStatesAll,
  tracGrouping,
  tracOrderColumn,
  tracOrderColumnDescending,
  userCompanyShortname,
} from "./assets/preferences";

const preparedColumns = `col=${tracColumns.replaceAll(/,\s*/g, "&col=")}`;
const preparedStates =
  tracStates === "all"
    ? `status=${tracStatesAll.replaceAll(/,\s*/g, "&status=")}`
    : `status=${tracStates.replaceAll(/,\s*/g, "&status=")}`;
const preparedReporter = `reporter=${userCompanyShortname}`;
const preparedCC = `cc=${userCompanyShortname}`;
const preparedGrouping = `group=${tracGrouping}`;
const preparedOrderColumn = tracOrderColumn !== "" ? `&order=${tracOrderColumn}` : "";
const preparedOrderColumnDescending = tracOrderColumnDescending === true ? `&desc=1` : "";

const finalQueryUrl = `${tracQueryUrl}?${preparedStates}&${preparedReporter}&or&${preparedStates}&${preparedCC}&${preparedColumns}&${preparedGrouping}${preparedOrderColumn}${preparedOrderColumnDescending}`;

export default async function Command() {
  open(encodeURI(finalQueryUrl));
}
