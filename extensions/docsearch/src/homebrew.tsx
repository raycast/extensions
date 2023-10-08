import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation id="da1d3562-0f6b-46ed-8c10-eed51f301102" quickSearch={props.arguments?.search} />;
}
