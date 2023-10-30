import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation id="b4875fde-8f69-4c58-af6c-2f974698d7eb" quickSearch={props.arguments?.search} />;
}
