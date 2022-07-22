import { Color, environment, LaunchType, LocalStorage, MenuBarExtra, open } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  getIssueComments,
  getPullComments,
  pullToCommentsParams
} from "./integration/getComments";
import { PullSearchResultShort } from "./integration/types";
import { getLogin } from "./integration/getLogin";
import { pullSearch } from "./integration/pullSearch";

// noinspection JSUnusedGlobalSymbols
export default function githubPullNotifications() {
  const [isLoading, setIsLoading] = useState(true);
  const [myPulls, setMyPulls] = useState<PullSearchResultShort[]>([]);
  const [participatedPulls, setParticipatedPulls] = useState<PullSearchResultShort[]>([]);
  const [recentPulls, setRecentPulls] = useState<PullSearchResultShort[]>([]);

  const addRecentPull = (pull: PullSearchResultShort) =>
    Promise.resolve()
      .then(() => recentPulls.filter(recentPull => recentPull.number !== pull.number))
      .then(filteredPulls => {
        const pulls = [pull, ...filteredPulls];

        setRecentPulls(pulls);

        return LocalStorage.setItem("recentPulls", JSON.stringify(pulls));
      });

  const onAction = (pull: PullSearchResultShort) =>
    Promise.resolve()
      .then(() => console.debug("action fired"))
      .then(() => open(pull.html_url))
      .then(() => console.debug("browser opened"))
      .then(() => addRecentPull(pull))
      .then(() => console.debug("pull added to recent pulls"))

  useEffect(() => {
    Promise.resolve()
      // .then(() => LocalStorage.removeItem("recentPulls"))
      .then(() => console.debug("initializing..."))
      .then(() => Promise.all([
        LocalStorage.getItem("myPulls").then(data => data as string | undefined),
        LocalStorage.getItem("participatedPulls").then(data => data as string | undefined),
        LocalStorage.getItem("recentPulls").then(data => data as string | undefined)
      ]))
      .then(([myPulls, participatedPulls, recentPulls]) => {
        myPulls && setMyPulls(JSON.parse(myPulls));
        participatedPulls && setParticipatedPulls(JSON.parse(participatedPulls));
        recentPulls && setRecentPulls(JSON.parse(recentPulls));
      })
      .then(() => {
        if (environment.launchType === LaunchType.UserInitiated) {
          console.debug("initiated by user; exiting");

          return Promise.resolve();
        }

        return getLogin()
          .then(login =>
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

                return Promise.all([
                  LocalStorage.setItem("myPulls", JSON.stringify(myPulls)),
                  LocalStorage.setItem("participatedPulls", JSON.stringify(participatedPulls))
                ])
                  .then(() => console.debug("stored my pulls and participated pulls"))
              }));
      })
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
        onAction={() => onAction(pull)}
      />)}
      {recentPulls.length > 0 && <MenuBarExtra.Submenu title="Recent Pulls">
        {recentPulls.map(pull => <MenuBarExtra.Item
          key={pull.id}
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