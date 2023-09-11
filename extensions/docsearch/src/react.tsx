import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation id="0d447343-8e25-4f46-b2de-ad3b84acb93f" quickSearch={props.arguments?.search} />;
}
