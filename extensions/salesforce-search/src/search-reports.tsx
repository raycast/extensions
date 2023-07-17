import { prefs } from "./salesforce/preferences";
import { parseObjectSpecs, SfObject } from "./salesforce/objects";
import { Command } from "./base-command";

const reportObjectSpecs = parseObjectSpecs(["Dashboard(Title)", "Report"], false);
const reportingObjects: SfObject[] = [
  {
    category: "reporting",
    apiName: "Dashboard",
    label: "Dashboard",
    labelPlural: "Dashboards",
    iconUrl: `https://${prefs.domain}.my.salesforce.com/img/icon/t4v35/standard/dashboard_120.png`,
    iconColor: "db7368",
  },
  {
    category: "reporting",
    apiName: "Report",
    label: "Report",
    labelPlural: "Reports",
    iconUrl: `https://${prefs.domain}.my.salesforce.com/img/icon/t4v35/standard/report_120.png`,
    iconColor: "64c8be",
  },
];

const SearchRecords = () => Command(reportObjectSpecs, () => Promise.resolve(reportingObjects));
export default SearchRecords;
