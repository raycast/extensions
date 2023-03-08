import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation docsName="RSSHub" quickSearch={props.arguments?.search} />;
}
