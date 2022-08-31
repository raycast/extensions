import { ISource, DouTuLaSource } from "./sources";

const sources: ISource[] = [new DouTuLaSource()];
const source = sources[0];

export default {
  get: (keyword: string, pageIndex: number, pageSize: number) => {
    return source.get(keyword, pageIndex, pageSize);
  },
};
