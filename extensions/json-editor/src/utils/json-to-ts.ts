import { json2ts } from "json-ts";

const jsonToTs = (input: string) => {
  return json2ts(input);
};

export default jsonToTs;
