import { ISource, DouTuLaSource } from "./sources";

const sources: ISource[] = [new DouTuLaSource()];
const source = sources[0];

export default {
  get: (keyword: string, pageIndex: number) => {
    console.log(`keyword:${keyword} pageIndex:${pageIndex}`);
    return source.get(keyword, pageIndex);
  },
};
