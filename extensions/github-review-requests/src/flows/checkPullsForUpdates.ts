import { getLogin } from "../integration/getLogin";
import { pullSearch } from "../integration/pullSearch";
import { AllPulls } from "../hooks/usePulls";
import { filterPulls } from "./filterPulls";
import { PullSearchResultShort, PullWithDependencies } from "../integration/types";
import { mapPullSearchResultToPRID } from "../tools/mapPullSearchResultToPRID";
import getReviews from "../integration/getReviews";
import { getIssueComments, getPullComments } from "../integration/getComments";
import getRequestedReviewers from "../integration/getRequestedReviewers";

export const checkPullsForUpdates = ({ hiddenPulls }: AllPulls) => getLogin()
  .then(login => Promise.all([
    login,
    fetchMyPulls(),
    fetchParticipatedPulls()
  ]))
  .then(([login, myPulls, participatedPulls]) => [
    login,
    myPulls,
    participatedPulls.filter(pull => !myPulls.find(myPull => myPull.number === pull.number))
  ] as [string, PullSearchResultShort[], PullSearchResultShort[]])
  .then(([login, myPulls, participatedPulls]) => Promise.all([
    login,
    [...myPulls, ...participatedPulls],
    Promise.all(myPulls.map(pullDependenciesForPull)),
    Promise.all(participatedPulls.map(pullDependenciesForPull))
  ] as [string, PullSearchResultShort[], Promise<PullWithDependencies[]>, Promise<PullWithDependencies[]>]))
  .then(
    ([login, allPulls, myPullsWithDependencies, participatedPullsWithDependencies]) => Promise.all([
      allPulls,
      filterPulls(login, hiddenPulls, myPullsWithDependencies),
      filterPulls(login, hiddenPulls, participatedPullsWithDependencies)
    ])
      .then(([allPulls, myPulls, participatedPulls]) => ({
        allPulls, myPulls, participatedPulls
      }))
  );

const fetchMyPulls = () => pullSearch("is:open archived:false author:@me");
const fetchParticipatedPulls = () =>
  Promise.all([
    pullSearch("is:open archived:false commenter:@me"),
    pullSearch("is:open archived:false review-requested:@me")
  ])
    .then(pulls => pulls.flat().filter((pull, index, pulls) => pulls.findIndex(p => p.number === pull.number) === index));

const pullDependenciesForPull = (pull: PullSearchResultShort) => Promise.resolve()
  .then(() => mapPullSearchResultToPRID(pull))
  .then(pullID => Promise.all([
    getPullComments(pullID),
    getIssueComments(pullID),
    getReviews(pullID),
    getRequestedReviewers(pullID)
  ]))
  .then(([pullComments, issueComments, reviews, requestedReviewers]) => ({
      pull,
      reviews,
      comments: pullComments.concat(issueComments),
      requestedReviewers
    } as PullWithDependencies)
  );
