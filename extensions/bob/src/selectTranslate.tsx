import { callBob } from "./utils";

export default async () => {
  await callBob(`{|path|:"translate", body:{action:"selectionTranslate"}}`);
};
