import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation docsName="React Bootstrap" quickSearch={props.arguments?.search} />;
}
