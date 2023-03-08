import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation docsName="pnpm" quickSearch={props.arguments?.search} />;
}
