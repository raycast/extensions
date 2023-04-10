import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation docsName="Vuepress v2" quickSearch={props.arguments?.search} />;
}
