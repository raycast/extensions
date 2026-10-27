import { Icon, Image, List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useState } from "react";
import { PersonActions, PersonMetadata, usePerson } from "./components/details";
import { formatDate, personName } from "./lib/outseta/format";
import { Person } from "./lib/outseta/types";
import { getClient, showErrorToast, useSettledPagination } from "./lib/raycast";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [showingDetail, setShowingDetail] = useCachedState("people-showing-detail", true);
  const [selectedUid, setSelectedUid] = useState<string>();

  const { data, isLoading, pagination } = useCachedPromise(
    (query: string) => async (options: { page: number }) => {
      const page = await getClient().searchPeople({ query: query.trim() || undefined, page: options.page });
      return { data: page.items, hasMore: page.hasMore };
    },
    [searchText],
    { keepPreviousData: true, onError: (error) => showErrorToast(error, "Couldn't search people") },
  );
  const settledPagination = useSettledPagination(pagination, isLoading);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail && !!data?.length}
      onSearchTextChange={setSearchText}
      onSelectionChange={(id) => setSelectedUid(id ?? undefined)}
      searchBarPlaceholder="Search people by name or email"
      throttle
      pagination={settledPagination}
    >
      <List.EmptyView
        icon={Icon.Person}
        title={searchText ? "No people found" : "No people yet"}
        description={searchText ? `Nothing in Outseta matches "${searchText}".` : undefined}
      />
      {data?.map((person) => (
        <PersonItem
          key={person.Uid}
          person={person}
          selected={person.Uid === selectedUid}
          showingDetail={showingDetail}
          onDetailToggle={() => setShowingDetail(!showingDetail)}
        />
      ))}
    </List>
  );
}

function PersonItem(props: { person: Person; selected: boolean; showingDetail: boolean; onDetailToggle: () => void }) {
  const { person, showingDetail } = props;
  // The list rows only carry light fields; the full record loads for the selected row.
  const { data: detail, isLoading } = usePerson(props.selected && showingDetail ? person.Uid : undefined);
  const full = detail ?? person;

  return (
    <List.Item
      id={person.Uid}
      title={personName(person)}
      subtitle={showingDetail ? undefined : person.Email}
      icon={
        person.ProfileImageS3Url ? { source: person.ProfileImageS3Url, mask: Image.Mask.Circle } : Icon.PersonCircle
      }
      accessories={showingDetail ? undefined : [{ text: formatDate(person.LastLoginDateTime), tooltip: "Last login" }]}
      detail={
        <List.Item.Detail
          isLoading={isLoading}
          metadata={<PersonMetadata key={detail ? "full" : "summary"} person={full} M={List.Item.Detail.Metadata} />}
        />
      }
      actions={<PersonActions person={full} onDetailToggle={props.onDetailToggle} />}
    />
  );
}
