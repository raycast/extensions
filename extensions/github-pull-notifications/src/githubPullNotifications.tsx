import { Cache, Color, MenuBarExtra } from "@raycast/api";
import {
  getIssueComments,
  getPullComments,
  pullSearch,
  PullSearchResultShort,
  pullToCommentsParams
} from "./hooks/usePullSearch";
import { useEffect, useState } from "react";

const cache = new Cache();

const login = "kudrykv";

export default function githubPullNotifications() {
  const [isLoading, setIsLoading] = useState(true);
  const [myPulls, setMyPulls] = useState<PullSearchResultShort[]>([]);
  const [participatedPulls, setParticipatedPulls] = useState<PullSearchResultShort[]>([]);

  useEffect(() => {
    console.debug("initializing...");

    console.debug("get from cache...");
    const myPulls = cache.get("myPulls");
    const participatedPulls = cache.get("participatedPulls");

    myPulls && setMyPulls(JSON.parse(myPulls));
    participatedPulls && setParticipatedPulls(JSON.parse(participatedPulls));
    console.debug("maybe got something from cache");

    Promise.all([
      fetchMyPulls(),
      fetchParticipatedPulls()
    ])
      .then(([myPulls, participatedPulls]) =>
        Promise.all([
          filterPulls(myPulls),
          filterPulls(participatedPulls)
        ]))
      .then(([myPulls, participatedPulls]) => {
        console.log("got my pulls", myPulls.length);
        console.log("got participated pulls", participatedPulls.length);

        setMyPulls(myPulls);
        setParticipatedPulls(participatedPulls);
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={{ source: "https://github.githubassets.com/favicons/favicon.png", tintColor: Color.Purple }}
      tooltip="Your Pull Requests"
      title={`${myPulls.length + participatedPulls.length} PRs to check`}
    >
      {myPulls.length > 0 && <MenuBarExtra.Item title="My Pulls" />}
      {myPulls.map(pull => <MenuBarExtra.Item
        key={pull.id}
        title={pull.title}
        icon="🤔"
      />)}
      {myPulls.length > 0 && participatedPulls.length > 0 && <MenuBarExtra.Separator />}
      {participatedPulls.length > 0 && <MenuBarExtra.Item title="Participated Pulls" />}
      {participatedPulls.map(pull => <MenuBarExtra.Item
        key={pull.id}
        title={pull.title}
        icon={pull.user?.avatar_url}
      />)}
    </MenuBarExtra>
  );
}

function filterPulls(myPulls: PullSearchResultShort[]) {
  return Promise.all(
    myPulls.map(
      pull =>
        Promise.all([
          getPullComments(pullToCommentsParams(pull)),
          getIssueComments(pullToCommentsParams(pull))
        ]).then(([pullComments, issueComments]) => pullComments.concat(issueComments))
          .then(comments => comments.sort((a, b) => a.created_at > b.created_at ? -1 : 1).pop())
          .then(comment => {
            console.log("comment:", pull.url, comment);

            return comment && comment.user?.login !== login ? pull : undefined;
          })
    )
  )
    .then(pulls => (pulls.filter(pull => pull) || []) as PullSearchResultShort[]);
}

const fetchMyPulls = () => pullSearch("is:open archived:false author:@me");
const fetchParticipatedPulls = () => pullSearch("is:open archived:false commenter:@me");