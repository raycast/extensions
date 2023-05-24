import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation id="3174b8d7-39cf-4631-8a6b-2faaf15b866e" quickSearch={props.arguments?.search} />;
}
