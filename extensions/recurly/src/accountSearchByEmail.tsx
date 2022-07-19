import PrepareList from "./components/PrepareList";
import UseEmailItem from "./components/EmailItem";

// noinspection JSUnusedGlobalSymbols
export default function accountSearchByEmail() {
  const [placeholder, EmailItem] = UseEmailItem();

  return <PrepareList placeholder={placeholder} Item={EmailItem} />;
}
