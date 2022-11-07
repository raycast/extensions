import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation docsName="Nuxt3" quickSearch={props.arguments?.search} />;
}
