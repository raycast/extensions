import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation id="2bf1b09a-6cb5-44d3-9812-c9d8df1ed45e" quickSearch={props.arguments?.search} />;
}
