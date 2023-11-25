import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation id="af8c6158-e2d7-465c-8f72-4b5fb922048b" quickSearch={props.arguments?.search} />;
}
