import AnydockItem, { ActionType } from "./components/AnydockItem";

export default function Switch() {
  return <AnydockItem type={ActionType.OpenAll} />;
}
