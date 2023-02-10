export const TransformJSObjectToJson = {
  from: "JS Object",
  to: "JSON",
  transform: (value: string) => {
    return JSON.stringify(eval("(" + value + ")"), null, 2);
  },
};
