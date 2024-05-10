import { Color, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import DetailedProposalList from "../UI/DetailedProposalList";
import { fetchProposals } from "../Domain/domain";
import { ProposalDataModel, Status } from "../Domain/ProposalDataModel";
import SimpleProposalList from "../UI/SimpleProposalList";
import ProposalGithubPage from "../UI/ProposalGithubPage";
import StatusFilter from "../UI/StatusFilter";

export default function ProposalsList() {
  const [state, setState] = useState<{ proposals: ProposalDataModel[]; filteredProposals: ProposalDataModel[] }>({
    proposals: [],
    filteredProposals: [],
  });
  const [showsDetails, setShowDetails] = useState<boolean>(true);
  const ListItem = showsDetails ? DetailedProposalList : SimpleProposalList;
  const { push } = useNavigation();

  useEffect(() => {
    async function fetch() {
      const proposals = await getProposals();
      setState((oldState) => ({
        ...oldState,
        proposals: proposals,
        filteredProposals: proposals,
      }));
    }
    fetch();
  }, []);

  return (
    <List
      isLoading={state.proposals.length === 0}
      isShowingDetail={showsDetails}
      searchBarPlaceholder="Filter proposals by name, status, id, swift version or description"
      searchBarAccessory={
        <StatusFilter
          onChange={(status) => {
            const filteredProposals = state.proposals.filter((proposal) => status === "All" || proposal.status === status);
            setState((oldState) => ({
              ...oldState,
              filteredProposals: filteredProposals,
            }));
          }}
        />
      }
    >
      {state.filteredProposals.map((proposal) => {
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

async function getProposals(): Promise<ProposalDataModel[]> {
  try {
    return await fetchProposals();
  } catch (error) {
    showToast(Toast.Style.Failure, "Failed", (error as Error).message);
    return Promise.resolve([]);
  }
}
