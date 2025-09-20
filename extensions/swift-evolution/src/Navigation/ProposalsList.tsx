import { List, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { ProposalDataModel, Status } from "../Domain/ProposalDataModel";
import DetailedProposalList from "../UI/DetailedProposalList";
import ProposalGithubPage from "../UI/ProposalGithubPage";
import SimpleProposalList from "../UI/SimpleProposalList";
import StatusFilter from "../UI/StatusFilter";
import { ProposalsQueryModel } from "../Domain/ProposalsQueryModel";

type UIState = {
  proposals: ProposalDataModel[];
  error: string | null;
};

export default function ProposalsList(props: { query: ProposalsQueryModel }) {
  const query = props.query;
  const [state, setState] = useState<UIState>({
    proposals: [],
    error: null,
  });
  const [showsDetails, setShowDetails] = useState<boolean>(true);
  const ListItem = showsDetails ? DetailedProposalList : SimpleProposalList;
  const { push } = useNavigation();

  useEffect(() => {
    async function fetchData() {
      try {
        const proposals = await query.fetchProposals();
        setState((oldState) => ({
          ...oldState,
          proposals: proposals,
        }));
      } catch (error) {
        showToast(Toast.Style.Failure, "Failed", (error as Error).message);
        setState(() => ({
          proposals: [],
          error: (error as Error).message,
        }));
      }
    }
    fetchData();
  }, []);

  return (
    <List
      isLoading={state.proposals.length === 0}
      isShowingDetail={showsDetails}
      searchBarPlaceholder="Filter proposals by name, status, id, swift version or description"
      searchBarAccessory={
        <StatusFilter
          onChange={(status) => {
            if (status === "All") {
              setState((oldState) => ({
                ...oldState,
                proposals: query.getAllModels(),
              }));
            } else {
              setState((oldState) => ({
                ...oldState,
                proposals: query.getModelsByStatus(status as Status),
              }));
            }
          }}
        />
      }
    >
      {state.proposals.map((proposal) => {
        const pushMarkdown = () =>
          push(<ProposalGithubPage markdownUrl={proposal.markdownLink} prUrl={proposal.link} />);
        return (
          <ListItem
            key={proposal.id}
            proposal={proposal}
            toggleDetails={() => {
              setShowDetails(!showsDetails);
            }}
            pushMarkdown={pushMarkdown}
          />
        );
      })}
    </List>
  );
}
