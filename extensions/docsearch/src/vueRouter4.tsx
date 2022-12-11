import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation docsName="Vue Router4" quickSearch={props.arguments?.search} />;
}
