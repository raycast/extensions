import { useEffect, useState } from "react";
import { environment, LaunchType, LocalStorage, open } from "@raycast/api";
import { PullRequestLastVisit, PullSearchResultShort } from "../integration/types";
import { getLogin } from "../integration/getLogin";
import { getIssueComments, getPullComments, pullToCommentsParams } from "../integration/getComments";
import { pullSearch } from "../integration/pullSearch";
import { loadPullsFromLocalStorage, setPullsToLocalStorage } from "../flows/store";

const myPullsKey = "myPulls";
const participatedPullsKey = "participatedPulls";

export default function usePulls() {
  const [isLoading, setIsLoading] = useState(true);
  const [myPulls, setMyPulls] = useState<PullSearchResultShort[]>([]);
  const [participatedPulls, setParticipatedPulls] = useState<PullSearchResultShort[]>([]);
  const [pullVisits, setPullVisits] = useState<PullRequestLastVisit[]>([]);

  const addRecentPull = (pull: PullSearchResultShort) =>
    Promise.resolve()
      .then(() => pullVisits.filter(recentVisit => recentVisit.pull.number !== pull.number))
      .then(filtered => [{pull, last_visit: getTimestampISOInSeconds()}, ...filtered])
      .then(pullVisits => {
        const myPullsFiltered = myPulls.filter(myPull => myPull.number !== pull.number);
        const participatedPullsFiltered = participatedPulls.filter(
          participatedPull => participatedPull.number !== pull.number
        );

        setPullVisits(pullVisits);
        setMyPulls(myPullsFiltered);
        setParticipatedPulls(participatedPullsFiltered);

        return setPullsToLocalStorage(myPullsFiltered, participatedPullsFiltered, pullVisits);
      })
      .then(() => console.debug(`addRecentPull completed`));

  const visitPull = (pull: PullSearchResultShort) =>
    open(pull.html_url)
      .then(() => addRecentPull(pull));


  useEffect(() => {
    Promise.resolve()
      // .then(() => LocalStorage.clear())
      .then(() => console.debug("initializing..."))
      .then(() => loadPullsFromLocalStorage())
      .then(({myPulls, participatedPulls, pullVisits}) => {
        setMyPulls(myPulls);
        setPullVisits(pullVisits);
        setParticipatedPulls(participatedPulls);

        return pullVisits;
      })
      .then((recentPullVisits) => {
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
                  filterPulls(login, recentPullVisits, myPulls),
                  filterPulls(login, recentPullVisits, participatedPulls)
                ]))
              .then(([myPulls, participatedPulls]) => {
                console.log("got my pulls", myPulls.length);
                console.log("got participated pulls", participatedPulls.length);

                setMyPulls(myPulls);
                setParticipatedPulls(participatedPulls);

                return Promise.all([
                  LocalStorage.setItem(myPullsKey, JSON.stringify(myPulls)),
                  LocalStorage.setItem(participatedPullsKey, JSON.stringify(participatedPulls))
                ])
                  .then(() => console.debug("stored my pulls and participated pulls"))
              }));
      })
      .finally(() => {
        setIsLoading(false);
        console.debug("done");
      });
  }, []);

  return {isLoading, myPulls, participatedPulls, pullVisits, visitPull};
}

function filterPulls(login: string, recentVisits: PullRequestLastVisit[], myPulls: PullSearchResultShort[]) {
  return Promise.all(
    myPulls.map(
      pull =>
        Promise.all([
          getPullComments(pullToCommentsParams(pull)),
          getIssueComments(pullToCommentsParams(pull))
        ]).then(([pullComments, issueComments]) => pullComments.concat(issueComments))
          .then(comments => comments.sort((a, b) => a.created_at < b.created_at ? -1 : 1).pop())
          .then(comment => {
            if (!comment || comment.user?.login === login) {
              return undefined;
            }

            const lastVisit = recentVisits.find(visit => visit.pull.id === pull.id);

            if (lastVisit && lastVisit.last_visit > comment.created_at) {
              return undefined;
            }

            pull.html_url = comment.html_url;

            return pull;
          })
    )
  )
    .then(pulls => (pulls.filter(pull => pull) || []) as PullSearchResultShort[]);
}

const fetchMyPulls = () => pullSearch("is:open archived:false author:@me");
const fetchParticipatedPulls = () => pullSearch("is:open archived:false commenter:@me");
const getTimestampISOInSeconds = () => new Date().toISOString().substring(0, 19) + "Z";
