import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation id="9c8d78ea-9a6b-4afa-b051-8187c0ee96d4" quickSearch={props.arguments?.search} />;
}
