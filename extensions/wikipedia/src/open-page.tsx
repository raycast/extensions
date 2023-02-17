import WikipediaPage from "./wikipedia-page";

export default function OpenPage(props: { arguments: { title: string } }) {
  return <WikipediaPage title={props.arguments.title} />;
}
