// DAW 专属的视图。和 index.ts 分开放：视图依赖 core，而 core 又引用 index.ts，放在一起会形成循环引用。
export { SetsView } from "./ableton/sets-view";
