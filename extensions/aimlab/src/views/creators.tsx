import { ActionPanel, Action, List } from "@raycast/api";
import useTopCreators from "../hooks/useTopCreators";
import AuthorComponent from "../components/Creator";

const Creators = () => {
  const { data, isLoading } = useTopCreators();

  return (
    <List searchBarPlaceholder="Filter on Creator" isLoading={isLoading}>
      {data && data.length > 0 ? (
        <List.Section title={`Top 10 Creators`}>
          {data?.map((author, index) => {
            return <AuthorComponent key={author.username} author={author} index={index} />;
          })}
        </List.Section>
      ) : (
        <List.EmptyView
          icon="logo.png"
          title="Nothing found!"
          description="Please visit the website instead"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="View Leaderboard on Aimlab" url={"https://aimlab.gg/aimlab/creators"} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
};

export default Creators;
