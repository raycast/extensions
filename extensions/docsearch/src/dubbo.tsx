import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation id="85e39537-84d3-442f-a7b3-c3cac9b64d60" quickSearch={props.arguments?.search} />;
}
