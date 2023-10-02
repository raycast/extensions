import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation id="cbcb3df9-ce8b-4ab4-8a39-2b860c518475" quickSearch={props.arguments?.search} />;
}
