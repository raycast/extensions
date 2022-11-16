import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation docsName="React Native" quickSearch={props.arguments?.search} />;
}
