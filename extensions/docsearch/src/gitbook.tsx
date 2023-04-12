import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation docsName="GitBook" quickSearch={props.arguments?.search} />;
}
