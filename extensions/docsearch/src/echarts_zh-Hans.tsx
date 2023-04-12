import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation docsName="Echarts" lang="zh-Hans" quickSearch={props.arguments?.search} />;
}
