import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation docsName="Laravel 9.x" quickSearch={props.arguments?.search} />;
}
