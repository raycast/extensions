import PrepareList from "./components/PrepareList";
import UseCodeItem from "./components/CodeItem";

// noinspection JSUnusedGlobalSymbols
export default function searchAccountByCode() {
  const [placeholder, CodeItem] = UseCodeItem();

  return <PrepareList placeholder={placeholder} Item={CodeItem} />;
}
