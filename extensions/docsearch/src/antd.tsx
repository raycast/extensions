import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation id="ed219486-9c94-4d9a-b993-69db4042e0c0" quickSearch={props.arguments?.search} />;
}
