import { callBob } from "./utils";

export default async () => {
  await callBob(`{|path|:"ocr", body:{action:"showWindow"}}`);
};
