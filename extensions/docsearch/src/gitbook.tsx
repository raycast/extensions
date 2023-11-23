import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation id="a70b02e2-573c-4af0-8b57-2de598b79e98" quickSearch={props.arguments?.search} />;
}
