import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation id="05b5bb50-2818-49d8-b3f7-590078eff494" quickSearch={props.arguments?.search} />;
}
