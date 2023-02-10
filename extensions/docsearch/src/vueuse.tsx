import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation docsName="VueUse" quickSearch={props.arguments?.search} />;
}
