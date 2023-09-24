import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation id="dd5dfe57-d905-4201-82c7-942f522b9ee8" quickSearch={props.arguments?.search} />;
}
