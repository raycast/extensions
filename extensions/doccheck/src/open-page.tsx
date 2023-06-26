import DocCheckPage from "./doccheck-page";

export default function OpenPage(props: { arguments: { url: string; navigationItems: string; query: string } }) {
  return (
    <DocCheckPage
      url={props.arguments.url}
      navigationItems={props.arguments.navigationItems}
      query={props.arguments.query}
    />
  );
}
