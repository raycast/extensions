import { Color, Image, MenuBarExtra, open } from "@raycast/api";
import { PullRequestFieldsFragment } from "./graphql/SearchPullRequests.generated";
import { useSearchPullRequests } from "./graphql/useSearchPullRequests";

export default function Menu() {
  const { isLoading, data } = useSearchPullRequests();
  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={getIcon(data?.reviewRequested.requests)}
      tooltip="Pending requested reviews"
    >
      {data?.reviewRequested.requests.map((pr) => (
        <MenuBarExtra.Item
          key={pr.repository.name + pr.number}
          title={pr.title}
          icon={
            pr.author?.avatarURL
              ? {
                  source: pr.author?.avatarURL,
                  mask: Image.Mask.Circle,
                }
              : undefined
          }
          onAction={() => open(pr.permalink)}
        ></MenuBarExtra.Item>
      ))}
      {data?.reviewRequested.requests.length === 0 && <MenuBarExtra.Item title={`🎉 Nothing to review.`} />}
    </MenuBarExtra>
  );
}

const getIcon = (updatedPulls: PullRequestFieldsFragment[] | undefined | null) =>
  updatedPulls !== null && updatedPulls !== undefined
    ? {
        source: "icon.png",
        tintColor: getTintColor(updatedPulls),
      }
    : undefined;

const getTintColor = (updatedPulls: PullRequestFieldsFragment[]) =>
  updatedPulls.length === 0 ? Color.PrimaryText : Color.Yellow;
