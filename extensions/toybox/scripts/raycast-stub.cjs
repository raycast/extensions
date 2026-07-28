// 测试用桩模块：任意命名导入均返回 noop，避免拉起真实 Raycast / React 运行时。
// 仅用于在 Node 中跑纯逻辑测试，源码中的 React 组件不会被实际渲染。
const noop = () => null;
const handler = { get: (t, p) => (p === "__esModule" ? true : noop) };
module.exports = new Proxy({}, handler);
