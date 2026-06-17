import { json2ts, JsonTsOptions } from "json-ts";

const jsonToTs = (input: string, options?: JsonTsOptions) => {
  return json2ts(input, options);
};

export default jsonToTs;
