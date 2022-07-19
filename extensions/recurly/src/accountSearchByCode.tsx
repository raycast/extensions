import PrepareList from "./components/PrepareList";
import UseCodeItem from "./components/CodeItem";

// noinspection JSUnusedGlobalSymbols
export default function accountSearchByCode() {
  const [placeholder, CodeItem] = UseCodeItem();

  return <PrepareList placeholder={placeholder} Item={CodeItem} />;
}
