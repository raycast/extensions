import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation id="3a255f8b-b932-493c-bc8b-9e7bc79ecd3a" quickSearch={props.arguments?.search} />;
}
