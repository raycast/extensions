import { Command } from "./base-command";
import { prefs } from "./salesforce/preferences";
import { fetchObjectMetadata, parseObjectSpecs, parseSemicolonSeparatedObjectSpecs } from "./salesforce/objects";

const recordObjectSpecs = [
  ...parseObjectSpecs(["Account", "Contact(Name,Account.Name)", "Opportunity"]),
  ...(prefs.additionalObjects ? parseSemicolonSeparatedObjectSpecs(prefs.additionalObjects) : []),
];

const SearchRecords = () => Command(recordObjectSpecs, () => fetchObjectMetadata(recordObjectSpecs));
export default SearchRecords;
