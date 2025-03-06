import { SearchDocumentation } from "./components";
import { DocID } from "./data/apis";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation id={DocID.Laravel} quickSearch={props.arguments?.search} />;
}
