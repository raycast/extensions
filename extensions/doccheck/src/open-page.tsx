import DocCheckPage from "./doccheck-page";

export default function OpenPage(props: { arguments: { url: string; navigationItems: string; query: string } }) {
  const dummyFunction = () => {
    // Do nothing here
  };

  return (
    <DocCheckPage
      url={props.arguments.url}
      navigationItems={props.arguments.navigationItems}
      query={props.arguments.query}
      onDetailViewPop={dummyFunction}
    />
  );
}
