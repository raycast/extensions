import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation id="4e3fd0d3-d77e-4b13-91df-96cb2e36737d" quickSearch={props.arguments?.search} />;
}
