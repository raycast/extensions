import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation docsName="Vuepress v1" quickSearch={props.arguments?.search} />;
}
