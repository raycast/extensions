// DAW 专属的视图。和 index.ts 分开放：视图依赖 core，而 core 又引用 index.ts，放在一起会形成循环引用。
// 共用代码按 SetsView、projectFilesInfo 这两个名字引用。LPM 在这里接上 Logic 的视图：文件夹形态的项目先列出里面的 .logicx，Package 直接进 Alternatives。
export { LogicSetsView as SetsView, projectFilesInfo } from "./logic/sets-view";
