import { getLogin } from "../integration/getLogin";
import { pullSearch } from "../integration/pullSearch";
import { AllPulls } from "../hooks/usePulls";
import { filterPulls } from "./filterPulls";

export const checkPullsForUpdates = ({ pullVisits }: AllPulls) => getLogin()
  .then(login => Promise.all([
    login,
    fetchMyPulls(),
    fetchParticipatedPulls()
  ]))
  .then(([login, myPulls, participatedPulls]) => Promise.all([
    filterPulls(login, pullVisits, myPulls),
    filterPulls(login, pullVisits, participatedPulls.filter(pull => !myPulls.find(myPull => myPull.number === pull.number)))
  ]));

const fetchMyPulls = () => pullSearch("is:open archived:false author:@me");
const fetchParticipatedPulls = () =>
  Promise.all([
    pullSearch("is:open archived:false commenter:@me"),
    pullSearch("is:open archived:false review-requested:@me")
  ])
    .then(pulls => pulls.flat().filter((pull, index, pulls) => pulls.findIndex(p => p.number === pull.number) === index));
