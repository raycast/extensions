import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation docsName="pnpm" lang="zh-Hans" quickSearch={props.arguments?.search} />;
}
