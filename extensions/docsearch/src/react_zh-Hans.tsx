import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation id="a7cc37c2-cd7c-4d1b-9db2-5dd3b25bc96e" quickSearch={props.arguments?.search} />;
}
