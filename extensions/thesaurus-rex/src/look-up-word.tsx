import LookupView from "./lookup-view";

export default function LookUpWord() {
  return <LookupView kinds={["synonyms", "antonyms", "definitions"]} />;
}
