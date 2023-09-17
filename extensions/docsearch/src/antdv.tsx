import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation id="43cd38be-82b8-4d54-9764-349fa2b7d6a3" quickSearch={props.arguments?.search} />;
}
