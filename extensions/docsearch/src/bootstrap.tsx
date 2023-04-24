import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation docsName="Bootstrap" quickSearch={props.arguments?.search} />;
}
