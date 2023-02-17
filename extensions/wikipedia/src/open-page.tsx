import ShowDetailsPage from "./show-details-page";

export default function OpenPage(props: { arguments: { title: string } }) {
  return <ShowDetailsPage title={props.arguments.title} />;
}
