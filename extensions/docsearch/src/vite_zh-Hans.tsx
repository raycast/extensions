import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation docsName="Vite" lang="zh-Hans" quickSearch={props.arguments?.search} />;
}
