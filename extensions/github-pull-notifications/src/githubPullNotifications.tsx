import { Cache, Color, environment, LaunchType, MenuBarExtra, open } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  getIssueComments,
  getPullComments,
  pullToCommentsParams
} from "./integration/getComments";
import { PullSearchResultShort } from "./integration/types";
import { getLogin } from "./integration/getLogin";
import { pullSearch } from "./integration/pullSearch";

const cache = new Cache();

// noinspection JSUnusedGlobalSymbols
export default function githubPullNotifications() {
  const [isLoading, setIsLoading] = useState(true);
  const [myPulls, setMyPulls] = useState<PullSearchResultShort[]>([]);
  const [participatedPulls, setParticipatedPulls] = useState<PullSearchResultShort[]>([]);
  const [recentPulls, setRecentPulls] = useState<PullSearchResultShort[]>([]);

  const addRecentPull = (pull: PullSearchResultShort) => {
    setRecentPulls(recentPulls => [...recentPulls, pull]);
    cache.set("recentPulls", JSON.stringify(recentPulls));
  };

  const onAction = (pull: PullSearchResultShort) =>
    () => open(pull.html_url).then(() => addRecentPull(pull));

  console.log("main func");

  useEffect(() => {
    console.debug("initializing...");

    console.debug("get from cache...");
    const myPulls = cache.get("myPulls");
    const participatedPulls = cache.get("participatedPulls");
    const recentPulls = cache.get("recentPulls");

    myPulls && setMyPulls(JSON.parse(myPulls));
    participatedPulls && setParticipatedPulls(JSON.parse(participatedPulls));
    recentPulls && setRecentPulls(JSON.parse(recentPulls));
    console.debug("maybe got something from cache");

    if (environment.launchType === LaunchType.UserInitiated) {
      console.debug("user initiated; exiting");
      setIsLoading(false);
      return;
    }

    getLogin().then(login =>
      Promise.all([
        fetchMyPulls(),
        fetchParticipatedPulls()
      ])
        .then(([myPulls, participatedPulls]) =>
          Promise.all([
            filterPulls(login, myPulls),
            filterPulls(login, participatedPulls)
          ]))
        .then(([myPulls, participatedPulls]) => {
          console.log("got my pulls", myPulls.length);
          console.log("got participated pulls", participatedPulls.length);

          setMyPulls(myPulls);
          setParticipatedPulls(participatedPulls);
          cache.set("myPulls", JSON.stringify(myPulls));
          cache.set("participatedPulls", JSON.stringify(participatedPulls));
        }))
      .finally(() => {
        setIsLoading(false);
        console.debug("done");
      });
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
        onAction={onAction(pull)}
      />)}
      {recentPulls.length > 0 && <MenuBarExtra.Submenu title="Recent Pulls">
        {recentPulls.map(pull => <MenuBarExtra.Item
          title={pull.title}
          icon={pull.user?.avatar_url}
          onAction={() => open(pull.html_url)}
        />)}
      </MenuBarExtra.Submenu>}
    </MenuBarExtra>
  );
}

function filterPulls(login: string, myPulls: PullSearchResultShort[]) {
  return Promise.all(
    myPulls.map(
      pull =>
        Promise.all([
          getPullComments(pullToCommentsParams(pull)),
          getIssueComments(pullToCommentsParams(pull))
        ]).then(([pullComments, issueComments]) => pullComments.concat(issueComments))
          .then(comments => comments.sort((a, b) => a.created_at < b.created_at ? -1 : 1).pop())
          .then(comment => {
            if (comment && comment.user?.login !== login) {
              pull.html_url = comment.html_url;

              return pull;
            }

            return undefined;
          })
    )
  )
    .then(pulls => (pulls.filter(pull => pull) || []) as PullSearchResultShort[]);
}

const fetchMyPulls = () => pullSearch("is:open archived:false author:@me");
const fetchParticipatedPulls = () => pullSearch("is:open archived:false commenter:@me");