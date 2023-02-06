import capitalize from "./capitalize";

const parseGroupLabel = (groupLabel: string) => capitalize(groupLabel.replace("group::", ""));

export default parseGroupLabel;
