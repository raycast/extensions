import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation docsName="Echarts" quickSearch={props.arguments?.search} />;
}
