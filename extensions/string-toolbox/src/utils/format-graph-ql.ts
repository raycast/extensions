import { format } from "prettier";
import { transformer } from "../helpers";
import { Util } from "../interfaces";

const formatGraphQl: Util = {
  name: "Format GraphQL",
  icon: "graphql_icon.png",
  description: "Cleans and formats YAML using prettier",
  inputType: "textarea",
  transform: transformer((s: string) => {
    return format(s, { parser: "graphql" });
  }),
};

export default formatGraphQl;
