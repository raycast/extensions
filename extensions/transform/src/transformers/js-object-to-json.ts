import JSON5 from "json5";

export const TransformJSObjectToJson = {
  from: "JS Object",
  to: "JSON",
  transform: (value: string) => {
    return JSON.stringify(JSON5.parse(value), null, 2);
  },
};
